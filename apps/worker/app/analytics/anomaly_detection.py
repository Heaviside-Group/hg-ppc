"""Anomaly detection for PPC performance metrics.

Detects unusual changes in metrics like CTR drops, CPC spikes,
conversion rate changes, and spend anomalies.
"""

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class Anomaly:
    """Represents a detected anomaly in performance data."""

    campaign_id: str
    campaign_name: str
    provider: str
    metric: str
    current_value: float
    expected_value: float
    deviation_pct: float
    z_score: float
    severity: str  # 'warning', 'critical'
    direction: str  # 'increase', 'decrease'
    date: date
    message: str


class AnomalyDetector:
    """Detects anomalies in campaign performance metrics."""

    # Metrics to monitor and their properties
    MONITORED_METRICS = {
        "ctr": {
            "name": "Click-Through Rate",
            "format": "percent",
            "good_direction": "increase",
        },
        "cpc": {
            "name": "Cost Per Click",
            "format": "currency",
            "good_direction": "decrease",
        },
        "cpa": {
            "name": "Cost Per Acquisition",
            "format": "currency",
            "good_direction": "decrease",
        },
        "conversion_rate": {
            "name": "Conversion Rate",
            "format": "percent",
            "good_direction": "increase",
        },
        "spend": {
            "name": "Daily Spend",
            "format": "currency",
            "good_direction": None,  # Neutral - depends on context
        },
        "impressions": {
            "name": "Impressions",
            "format": "number",
            "good_direction": "increase",
        },
    }

    # Z-score thresholds for anomaly severity
    WARNING_THRESHOLD = 2.0  # ~95% confidence
    CRITICAL_THRESHOLD = 3.0  # ~99.7% confidence

    def __init__(
        self,
        lookback_days: int = 30,
        min_data_points: int = 7,
    ):
        """Initialize the anomaly detector.

        Args:
            lookback_days: Number of days of historical data to analyze.
            min_data_points: Minimum data points required for analysis.
        """
        self.lookback_days = lookback_days
        self.min_data_points = min_data_points

    def detect_anomalies(
        self,
        daily_metrics: list[dict[str, Any]],
        analysis_date: date | None = None,
    ) -> list[Anomaly]:
        """Detect anomalies in daily campaign metrics.

        Args:
            daily_metrics: List of daily metric records with fields:
                - campaign_id, campaign_name, provider, date
                - impressions, clicks, spend_micros, conversions
            analysis_date: Date to analyze (defaults to most recent).

        Returns:
            List of detected anomalies.
        """
        if not daily_metrics:
            logger.warning("No metrics provided for anomaly detection")
            return []

        # Convert to DataFrame
        df = pd.DataFrame(daily_metrics)
        df["date"] = pd.to_datetime(df["date"]).dt.date

        # Determine analysis date
        if analysis_date is None:
            analysis_date = df["date"].max()

        # Calculate derived metrics
        df = self._calculate_derived_metrics(df)

        # Group by campaign and detect anomalies
        anomalies = []
        for campaign_id in df["campaign_id"].unique():
            campaign_df = df[df["campaign_id"] == campaign_id].sort_values("date")

            if len(campaign_df) < self.min_data_points:
                continue

            campaign_name = campaign_df["campaign_name"].iloc[-1]
            provider = campaign_df["provider"].iloc[-1]

            # Check each metric
            for metric, config in self.MONITORED_METRICS.items():
                if metric not in campaign_df.columns:
                    continue

                anomaly = self._check_metric_anomaly(
                    campaign_df,
                    campaign_id,
                    campaign_name,
                    provider,
                    metric,
                    config,
                    analysis_date,
                )
                if anomaly:
                    anomalies.append(anomaly)

        # Sort by severity (critical first) and z_score
        anomalies.sort(
            key=lambda a: (0 if a.severity == "critical" else 1, -abs(a.z_score))
        )

        return anomalies

    def _calculate_derived_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate derived metrics from raw data."""
        # Convert spend from micros to dollars
        df["spend"] = df["spend_micros"] / 1_000_000

        # Calculate rates (with zero division handling)
        df["ctr"] = np.where(
            df["impressions"] > 0,
            df["clicks"] / df["impressions"] * 100,
            0,
        )
        df["cpc"] = np.where(
            df["clicks"] > 0,
            df["spend"] / df["clicks"],
            0,
        )
        df["cpa"] = np.where(
            df["conversions"] > 0,
            df["spend"] / df["conversions"],
            0,
        )
        df["conversion_rate"] = np.where(
            df["clicks"] > 0,
            df["conversions"] / df["clicks"] * 100,
            0,
        )

        return df

    def _check_metric_anomaly(
        self,
        campaign_df: pd.DataFrame,
        campaign_id: str,
        campaign_name: str,
        provider: str,
        metric: str,
        config: dict,
        analysis_date: date,
    ) -> Anomaly | None:
        """Check if a specific metric is anomalous.

        Uses z-score based detection comparing recent value to
        historical distribution.
        """
        # Get historical data (excluding analysis date)
        cutoff_date = analysis_date - timedelta(days=self.lookback_days)
        historical = campaign_df[
            (campaign_df["date"] >= cutoff_date) & (campaign_df["date"] < analysis_date)
        ][metric]

        # Get current day value
        current_row = campaign_df[campaign_df["date"] == analysis_date]
        if current_row.empty:
            return None

        current_value = current_row[metric].iloc[0]

        # Need enough historical data
        if len(historical) < self.min_data_points:
            return None

        # Calculate statistics
        mean = historical.mean()
        std = historical.std()

        # Avoid division by zero
        if std == 0 or np.isnan(std):
            return None

        # Calculate z-score
        z_score = (current_value - mean) / std

        # Check if anomalous
        if abs(z_score) < self.WARNING_THRESHOLD:
            return None

        # Determine severity and direction
        severity = "critical" if abs(z_score) >= self.CRITICAL_THRESHOLD else "warning"
        direction = "increase" if z_score > 0 else "decrease"

        # Calculate deviation percentage
        deviation_pct = ((current_value - mean) / mean * 100) if mean != 0 else 0

        # Generate message
        message = self._generate_anomaly_message(
            campaign_name,
            config["name"],
            current_value,
            mean,
            deviation_pct,
            direction,
            config["format"],
            config["good_direction"],
        )

        return Anomaly(
            campaign_id=campaign_id,
            campaign_name=campaign_name,
            provider=provider,
            metric=metric,
            current_value=current_value,
            expected_value=mean,
            deviation_pct=deviation_pct,
            z_score=z_score,
            severity=severity,
            direction=direction,
            date=analysis_date,
            message=message,
        )

    def _generate_anomaly_message(
        self,
        campaign_name: str,
        metric_name: str,
        current: float,
        expected: float,
        deviation_pct: float,
        direction: str,
        format_type: str,
        good_direction: str | None,
    ) -> str:
        """Generate a human-readable anomaly message."""
        # Format values based on type
        if format_type == "percent":
            current_str = f"{current:.2f}%"
            expected_str = f"{expected:.2f}%"
        elif format_type == "currency":
            current_str = f"${current:.2f}"
            expected_str = f"${expected:.2f}"
        else:
            current_str = f"{current:,.0f}"
            expected_str = f"{expected:,.0f}"

        # Determine if this is good or bad
        if good_direction:
            is_positive = direction == good_direction
            sentiment = "improved" if is_positive else "degraded"
        else:
            sentiment = "changed"

        return (
            f"{campaign_name}: {metric_name} {sentiment} significantly. "
            f"Current: {current_str} vs Expected: {expected_str} "
            f"({deviation_pct:+.1f}% {direction})"
        )

    def get_anomaly_summary(
        self,
        anomalies: list[Anomaly],
    ) -> dict[str, Any]:
        """Generate a summary of detected anomalies.

        Args:
            anomalies: List of detected anomalies.

        Returns:
            Summary dict with counts and key insights.
        """
        if not anomalies:
            return {
                "total": 0,
                "critical": 0,
                "warning": 0,
                "by_metric": {},
                "by_provider": {},
                "top_concerns": [],
            }

        df = pd.DataFrame([a.__dict__ for a in anomalies])

        return {
            "total": len(anomalies),
            "critical": len(df[df["severity"] == "critical"]),
            "warning": len(df[df["severity"] == "warning"]),
            "by_metric": df["metric"].value_counts().to_dict(),
            "by_provider": df["provider"].value_counts().to_dict(),
            "top_concerns": [a.message for a in anomalies[:5]],
        }
