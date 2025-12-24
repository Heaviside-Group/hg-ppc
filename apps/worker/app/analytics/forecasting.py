"""Performance forecasting for PPC campaigns.

Predicts future spend, conversions, and other metrics using
time series analysis and regression techniques.
"""

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)


@dataclass
class Forecast:
    """Represents a forecast for a metric."""

    metric: str
    metric_name: str
    current_period_actual: float
    current_period_projected: float
    next_period_forecast: float
    trend: str  # 'up', 'down', 'stable'
    trend_pct: float
    confidence: str  # 'high', 'medium', 'low'
    forecast_dates: list[date]
    forecast_values: list[float]


@dataclass
class PacingStatus:
    """Represents budget pacing status for the current period."""

    campaign_id: str
    campaign_name: str
    provider: str
    period_budget: float
    spent_to_date: float
    days_elapsed: int
    days_remaining: int
    pacing_status: str  # 'on_track', 'underspending', 'overspending'
    projected_spend: float
    projected_variance: float
    recommendation: str


class PerformanceForecaster:
    """Forecasts campaign performance metrics."""

    # Metrics to forecast
    FORECAST_METRICS = {
        "spend": {"name": "Spend", "format": "currency"},
        "conversions": {"name": "Conversions", "format": "number"},
        "clicks": {"name": "Clicks", "format": "number"},
        "impressions": {"name": "Impressions", "format": "number"},
        "conversion_value": {"name": "Revenue", "format": "currency"},
    }

    def __init__(
        self,
        lookback_days: int = 30,
        forecast_days: int = 30,
    ):
        """Initialize the forecaster.

        Args:
            lookback_days: Days of historical data to use.
            forecast_days: Days to forecast into the future.
        """
        self.lookback_days = lookback_days
        self.forecast_days = forecast_days

    def generate_forecasts(
        self,
        daily_metrics: list[dict[str, Any]],
        metrics: list[str] | None = None,
    ) -> list[Forecast]:
        """Generate forecasts for specified metrics.

        Args:
            daily_metrics: Historical daily metrics.
            metrics: Specific metrics to forecast (defaults to all).

        Returns:
            List of forecasts for each metric.
        """
        if not daily_metrics:
            logger.warning("No metrics provided for forecasting")
            return []

        # Convert to DataFrame and aggregate by date
        df = pd.DataFrame(daily_metrics)
        df["date"] = pd.to_datetime(df["date"]).dt.date
        df["spend"] = df["spend_micros"] / 1_000_000

        # Aggregate across all campaigns by date
        daily_agg = (
            df.groupby("date")
            .agg(
                {
                    "impressions": "sum",
                    "clicks": "sum",
                    "spend": "sum",
                    "conversions": "sum",
                    "conversion_value": "sum",
                }
            )
            .reset_index()
            .sort_values("date")
        )

        if len(daily_agg) < 7:
            logger.warning("Insufficient data points for forecasting")
            return []

        # Determine which metrics to forecast
        target_metrics = metrics or list(self.FORECAST_METRICS.keys())

        forecasts = []
        for metric in target_metrics:
            if metric not in daily_agg.columns:
                continue

            forecast = self._forecast_metric(
                daily_agg,
                metric,
                self.FORECAST_METRICS.get(metric, {"name": metric, "format": "number"}),
            )
            if forecast:
                forecasts.append(forecast)

        return forecasts

    def _forecast_metric(
        self,
        daily_df: pd.DataFrame,
        metric: str,
        config: dict,
    ) -> Forecast | None:
        """Forecast a single metric using linear regression."""
        # Prepare data
        df = daily_df[["date", metric]].copy()
        df = df.dropna()

        if len(df) < 7:
            return None

        # Convert date to numeric for regression
        df["day_num"] = (df["date"] - df["date"].min()).apply(lambda x: x.days)

        # Fit linear regression
        X = df["day_num"].values.reshape(-1, 1)
        y = df[metric].values

        model = LinearRegression()
        model.fit(X, y)

        # Calculate R² for confidence assessment
        r_squared = model.score(X, y)
        confidence = "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low"

        # Generate forecast dates
        last_date = df["date"].max()
        forecast_dates = [
            last_date + timedelta(days=i + 1) for i in range(self.forecast_days)
        ]
        last_day_num = df["day_num"].max()
        forecast_day_nums = np.array(
            [last_day_num + i + 1 for i in range(self.forecast_days)]
        ).reshape(-1, 1)

        # Predict
        forecast_values = model.predict(forecast_day_nums)
        forecast_values = np.maximum(forecast_values, 0)  # No negative values

        # Calculate trend
        slope = model.coef_[0]
        avg_value = df[metric].mean()
        trend_pct = (slope / avg_value * 100) if avg_value > 0 else 0

        if trend_pct > 5:
            trend = "up"
        elif trend_pct < -5:
            trend = "down"
        else:
            trend = "stable"

        # Current month projections
        today = date.today()
        start_of_month = today.replace(day=1)
        days_in_month = (
            (today.replace(month=today.month % 12 + 1, day=1) - timedelta(days=1)).day
            if today.month < 12
            else 31
        )

        # Actual so far this period
        current_period_data = df[df["date"] >= start_of_month]
        current_period_actual = current_period_data[metric].sum()

        # Project full month
        days_elapsed = (today - start_of_month).days + 1
        if days_elapsed > 0:
            daily_avg = current_period_actual / days_elapsed
            current_period_projected = daily_avg * days_in_month
        else:
            current_period_projected = current_period_actual

        # Next period forecast (sum of forecast values for days_in_month)
        next_period_forecast = float(np.sum(forecast_values[:days_in_month]))

        return Forecast(
            metric=metric,
            metric_name=config["name"],
            current_period_actual=current_period_actual,
            current_period_projected=current_period_projected,
            next_period_forecast=next_period_forecast,
            trend=trend,
            trend_pct=trend_pct,
            confidence=confidence,
            forecast_dates=forecast_dates,
            forecast_values=forecast_values.tolist(),
        )

    def calculate_pacing(
        self,
        campaigns: list[dict[str, Any]],
        daily_metrics: list[dict[str, Any]],
        period_start: date | None = None,
        period_end: date | None = None,
    ) -> list[PacingStatus]:
        """Calculate budget pacing status for campaigns.

        Args:
            campaigns: Campaign records with budget info.
            daily_metrics: Historical daily spend data.
            period_start: Start of pacing period (default: start of month).
            period_end: End of pacing period (default: end of month).

        Returns:
            List of pacing status for each campaign.
        """
        if not campaigns or not daily_metrics:
            return []

        # Default to current month
        today = date.today()
        if period_start is None:
            period_start = today.replace(day=1)
        if period_end is None:
            # Last day of month
            if today.month == 12:
                period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                period_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

        # Convert to DataFrames
        campaigns_df = pd.DataFrame(campaigns)
        metrics_df = pd.DataFrame(daily_metrics)
        metrics_df["date"] = pd.to_datetime(metrics_df["date"]).dt.date
        metrics_df["spend"] = metrics_df["spend_micros"] / 1_000_000

        # Filter to current period
        period_metrics = metrics_df[
            (metrics_df["date"] >= period_start) & (metrics_df["date"] <= today)
        ]

        # Aggregate spend by campaign
        spend_by_campaign = (
            period_metrics.groupby("campaign_id")["spend"].sum().to_dict()
        )

        pacing_results = []
        days_elapsed = (today - period_start).days + 1
        days_remaining = (period_end - today).days
        total_days = (period_end - period_start).days + 1

        for _, campaign in campaigns_df.iterrows():
            campaign_id = str(campaign.get("id", ""))
            daily_budget = campaign.get("daily_budget_micros", 0) / 1_000_000
            period_budget = daily_budget * total_days

            spent_to_date = spend_by_campaign.get(campaign_id, 0)

            # Calculate expected spend by now
            expected_spend = (days_elapsed / total_days) * period_budget

            # Determine pacing status
            if expected_spend > 0:
                pacing_ratio = spent_to_date / expected_spend
                if pacing_ratio > 1.1:
                    pacing_status = "overspending"
                elif pacing_ratio < 0.9:
                    pacing_status = "underspending"
                else:
                    pacing_status = "on_track"
            else:
                pacing_status = "on_track"

            # Project end-of-period spend
            if days_elapsed > 0:
                daily_avg = spent_to_date / days_elapsed
                projected_spend = spent_to_date + (daily_avg * days_remaining)
            else:
                projected_spend = period_budget

            projected_variance = projected_spend - period_budget

            # Generate recommendation
            recommendation = self._generate_pacing_recommendation(
                pacing_status,
                projected_variance,
                days_remaining,
            )

            pacing_results.append(
                PacingStatus(
                    campaign_id=campaign_id,
                    campaign_name=campaign.get("name", "Unknown"),
                    provider=campaign.get("provider", "unknown"),
                    period_budget=period_budget,
                    spent_to_date=spent_to_date,
                    days_elapsed=days_elapsed,
                    days_remaining=days_remaining,
                    pacing_status=pacing_status,
                    projected_spend=projected_spend,
                    projected_variance=projected_variance,
                    recommendation=recommendation,
                )
            )

        # Sort by variance (largest issues first)
        pacing_results.sort(key=lambda p: -abs(p.projected_variance))

        return pacing_results

    def _generate_pacing_recommendation(
        self,
        pacing_status: str,
        variance: float,
        days_remaining: int,
    ) -> str:
        """Generate pacing recommendation based on status."""
        if pacing_status == "on_track":
            return "Budget pacing is healthy. Continue current strategy."

        if pacing_status == "overspending":
            if days_remaining > 7:
                return f"Consider reducing daily spend by ${abs(variance) / days_remaining:.2f} to stay on budget."
            else:
                return f"Projected to overspend by ${abs(variance):.2f}. Review campaign efficiency."

        if pacing_status == "underspending":
            if days_remaining > 7:
                return f"Opportunity to increase spend by ${abs(variance) / days_remaining:.2f}/day."
            else:
                return f"May underspend by ${abs(variance):.2f}. Consider increasing bids or budgets."

        return "Monitor performance closely."

    def forecast_conversions(
        self,
        daily_metrics: list[dict[str, Any]],
        target_date: date | None = None,
    ) -> dict[str, Any]:
        """Forecast conversions for a specific target date.

        Args:
            daily_metrics: Historical metrics.
            target_date: Date to forecast (default: end of month).

        Returns:
            Forecast details including value and confidence.
        """
        forecasts = self.generate_forecasts(daily_metrics, ["conversions"])

        if not forecasts:
            return {"error": "Insufficient data for forecasting"}

        conv_forecast = forecasts[0]

        today = date.today()
        if target_date is None:
            # End of month
            if today.month == 12:
                target_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                target_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

        # Find forecast value for target date
        target_idx = None
        for i, fd in enumerate(conv_forecast.forecast_dates):
            if fd >= target_date:
                target_idx = i
                break

        if target_idx is None:
            target_idx = len(conv_forecast.forecast_values) - 1

        # Sum conversions up to target date
        cumulative_forecast = sum(conv_forecast.forecast_values[: target_idx + 1])

        return {
            "target_date": target_date.isoformat(),
            "forecasted_conversions": round(
                conv_forecast.current_period_actual + cumulative_forecast
            ),
            "current_conversions": conv_forecast.current_period_actual,
            "trend": conv_forecast.trend,
            "trend_pct": conv_forecast.trend_pct,
            "confidence": conv_forecast.confidence,
        }
