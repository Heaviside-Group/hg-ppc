"""Budget optimization for PPC campaigns.

Analyzes spend efficiency across campaigns and recommends
budget reallocations to maximize ROI.
"""

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class BudgetRecommendation:
    """Represents a budget reallocation recommendation."""

    campaign_id: str
    campaign_name: str
    provider: str
    current_budget: float
    recommended_budget: float
    change_amount: float
    change_pct: float
    reason: str
    efficiency_score: float
    priority: str  # 'high', 'medium', 'low'
    expected_impact: str


@dataclass
class CrossPlatformInsight:
    """Insight comparing performance across platforms."""

    metric: str
    google_value: float
    meta_value: float
    winner: str
    recommendation: str


class BudgetOptimizer:
    """Optimizes budget allocation across campaigns."""

    # Minimum thresholds for analysis
    MIN_SPEND = 10.0  # Minimum spend to include campaign
    MIN_CLICKS = 10  # Minimum clicks for reliable data

    # Efficiency score weights
    WEIGHTS = {
        "cpa_efficiency": 0.4,  # Lower CPA = better
        "conversion_rate": 0.3,  # Higher CVR = better
        "roas": 0.3,  # Higher ROAS = better
    }

    def __init__(
        self,
        lookback_days: int = 30,
        max_budget_change_pct: float = 30.0,
    ):
        """Initialize the budget optimizer.

        Args:
            lookback_days: Days of data to analyze.
            max_budget_change_pct: Maximum recommended budget change.
        """
        self.lookback_days = lookback_days
        self.max_budget_change_pct = max_budget_change_pct

    def generate_recommendations(
        self,
        campaigns: list[dict[str, Any]],
        daily_metrics: list[dict[str, Any]],
        total_budget_constraint: float | None = None,
    ) -> list[BudgetRecommendation]:
        """Generate budget reallocation recommendations.

        Args:
            campaigns: List of campaign records with current budget info.
            daily_metrics: Historical daily metrics for analysis.
            total_budget_constraint: Optional total budget to maintain.

        Returns:
            List of budget recommendations sorted by priority.
        """
        if not campaigns or not daily_metrics:
            logger.warning("Insufficient data for budget optimization")
            return []

        # Convert to DataFrames
        campaigns_df = pd.DataFrame(campaigns)
        metrics_df = pd.DataFrame(daily_metrics)
        metrics_df["date"] = pd.to_datetime(metrics_df["date"]).dt.date

        # Aggregate metrics by campaign
        campaign_stats = self._aggregate_campaign_metrics(metrics_df)

        if campaign_stats.empty:
            return []

        # Calculate efficiency scores
        campaign_stats = self._calculate_efficiency_scores(campaign_stats)

        # Merge with current budget info
        campaigns_df["campaign_id"] = campaigns_df["id"].astype(str)
        campaign_stats = campaign_stats.merge(
            campaigns_df[["campaign_id", "name", "provider", "daily_budget_micros"]],
            on="campaign_id",
            how="inner",
        )

        # Convert budget from micros
        campaign_stats["current_budget"] = (
            campaign_stats["daily_budget_micros"] / 1_000_000
        )

        # Generate recommendations
        recommendations = self._calculate_recommendations(
            campaign_stats,
            total_budget_constraint,
        )

        return recommendations

    def _aggregate_campaign_metrics(
        self,
        metrics_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """Aggregate daily metrics by campaign."""
        cutoff_date = date.today() - timedelta(days=self.lookback_days)
        recent = metrics_df[metrics_df["date"] >= cutoff_date]

        if recent.empty:
            return pd.DataFrame()

        # Aggregate metrics
        agg = (
            recent.groupby("campaign_id")
            .agg(
                {
                    "impressions": "sum",
                    "clicks": "sum",
                    "spend_micros": "sum",
                    "conversions": "sum",
                    "conversion_value": "sum",
                }
            )
            .reset_index()
        )

        # Convert spend to dollars
        agg["spend"] = agg["spend_micros"] / 1_000_000

        # Filter campaigns with enough data
        agg = agg[
            (agg["spend"] >= self.MIN_SPEND) & (agg["clicks"] >= self.MIN_CLICKS)
        ]

        # Calculate performance metrics
        agg["ctr"] = np.where(
            agg["impressions"] > 0,
            agg["clicks"] / agg["impressions"] * 100,
            0,
        )
        agg["cpc"] = np.where(
            agg["clicks"] > 0,
            agg["spend"] / agg["clicks"],
            0,
        )
        agg["cpa"] = np.where(
            agg["conversions"] > 0,
            agg["spend"] / agg["conversions"],
            np.inf,
        )
        agg["conversion_rate"] = np.where(
            agg["clicks"] > 0,
            agg["conversions"] / agg["clicks"] * 100,
            0,
        )
        agg["roas"] = np.where(
            agg["spend"] > 0,
            agg["conversion_value"] / agg["spend"],
            0,
        )

        return agg

    def _calculate_efficiency_scores(
        self,
        stats_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """Calculate composite efficiency scores for campaigns."""
        if stats_df.empty:
            return stats_df

        # Normalize metrics to 0-1 scale
        # For CPA, lower is better so we invert
        cpa_valid = stats_df[stats_df["cpa"] < np.inf]["cpa"]
        if len(cpa_valid) > 0:
            cpa_max = cpa_valid.max()
            stats_df["cpa_score"] = np.where(
                stats_df["cpa"] < np.inf,
                1 - (stats_df["cpa"] / cpa_max) if cpa_max > 0 else 0,
                0,
            )
        else:
            stats_df["cpa_score"] = 0

        # For conversion rate and ROAS, higher is better
        cvr_max = stats_df["conversion_rate"].max()
        stats_df["cvr_score"] = (
            stats_df["conversion_rate"] / cvr_max if cvr_max > 0 else 0
        )

        roas_max = stats_df["roas"].max()
        stats_df["roas_score"] = stats_df["roas"] / roas_max if roas_max > 0 else 0

        # Calculate weighted efficiency score
        stats_df["efficiency_score"] = (
            self.WEIGHTS["cpa_efficiency"] * stats_df["cpa_score"]
            + self.WEIGHTS["conversion_rate"] * stats_df["cvr_score"]
            + self.WEIGHTS["roas"] * stats_df["roas_score"]
        )

        return stats_df

    def _calculate_recommendations(
        self,
        stats_df: pd.DataFrame,
        total_budget_constraint: float | None,
    ) -> list[BudgetRecommendation]:
        """Calculate budget recommendations based on efficiency scores."""
        recommendations = []

        # Calculate average efficiency score
        avg_efficiency = stats_df["efficiency_score"].mean()
        std_efficiency = stats_df["efficiency_score"].std()

        # Current total budget
        current_total = stats_df["current_budget"].sum()
        target_total = total_budget_constraint or current_total

        for _, row in stats_df.iterrows():
            efficiency = row["efficiency_score"]
            current_budget = row["current_budget"]

            # Determine if campaign should get more or less budget
            efficiency_delta = efficiency - avg_efficiency

            # Calculate recommended change based on efficiency
            if std_efficiency > 0:
                z_score = efficiency_delta / std_efficiency
                # Scale to percentage change (capped)
                change_pct = np.clip(
                    z_score * 10,  # 10% change per standard deviation
                    -self.max_budget_change_pct,
                    self.max_budget_change_pct,
                )
            else:
                change_pct = 0

            # Calculate recommended budget
            recommended_budget = current_budget * (1 + change_pct / 100)
            change_amount = recommended_budget - current_budget

            # Skip small changes
            if abs(change_pct) < 5:
                continue

            # Determine priority
            if abs(change_pct) >= 20:
                priority = "high"
            elif abs(change_pct) >= 10:
                priority = "medium"
            else:
                priority = "low"

            # Generate reason
            reason = self._generate_reason(row, change_pct)
            expected_impact = self._estimate_impact(row, change_pct)

            recommendations.append(
                BudgetRecommendation(
                    campaign_id=row["campaign_id"],
                    campaign_name=row["name"],
                    provider=row["provider"],
                    current_budget=current_budget,
                    recommended_budget=recommended_budget,
                    change_amount=change_amount,
                    change_pct=change_pct,
                    reason=reason,
                    efficiency_score=efficiency,
                    priority=priority,
                    expected_impact=expected_impact,
                )
            )

        # Sort by priority and absolute change
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(
            key=lambda r: (priority_order[r.priority], -abs(r.change_pct))
        )

        return recommendations

    def _generate_reason(self, row: pd.Series, change_pct: float) -> str:
        """Generate explanation for the recommendation."""
        if change_pct > 0:
            if row["roas"] > 2:
                return f"High ROAS ({row['roas']:.1f}x) indicates strong returns"
            elif row["cpa"] < row.get("avg_cpa", row["cpa"]):
                return f"Below-average CPA (${row['cpa']:.2f}) shows efficiency"
            else:
                return f"Strong conversion rate ({row['conversion_rate']:.1f}%)"
        else:
            if row["roas"] < 1:
                return f"Low ROAS ({row['roas']:.1f}x) suggests poor returns"
            elif row["conversion_rate"] < 1:
                return f"Low conversion rate ({row['conversion_rate']:.1f}%)"
            else:
                return f"High CPA (${row['cpa']:.2f}) indicates inefficiency"

    def _estimate_impact(self, row: pd.Series, change_pct: float) -> str:
        """Estimate the impact of the budget change."""
        if change_pct > 0:
            extra_spend = row["current_budget"] * (change_pct / 100)
            if row["cpa"] > 0 and row["cpa"] < np.inf:
                extra_conversions = extra_spend / row["cpa"]
                return f"~{extra_conversions:.0f} additional conversions/day"
        else:
            reduced_spend = abs(row["current_budget"] * (change_pct / 100))
            return f"Save ~${reduced_spend:.0f}/day for reallocation"

        return "Monitor performance after change"

    def get_cross_platform_insights(
        self,
        daily_metrics: list[dict[str, Any]],
    ) -> list[CrossPlatformInsight]:
        """Generate insights comparing Google Ads vs Meta Ads performance.

        Args:
            daily_metrics: Historical metrics with provider field.

        Returns:
            List of cross-platform insights.
        """
        if not daily_metrics:
            return []

        df = pd.DataFrame(daily_metrics)
        df["spend"] = df["spend_micros"] / 1_000_000

        # Aggregate by provider
        by_provider = (
            df.groupby("provider")
            .agg(
                {
                    "impressions": "sum",
                    "clicks": "sum",
                    "spend": "sum",
                    "conversions": "sum",
                    "conversion_value": "sum",
                }
            )
            .to_dict("index")
        )

        if "google_ads" not in by_provider or "meta" not in by_provider:
            return []

        google = by_provider["google_ads"]
        meta = by_provider["meta"]

        insights = []

        # Compare CTR
        google_ctr = (
            google["clicks"] / google["impressions"] * 100
            if google["impressions"] > 0
            else 0
        )
        meta_ctr = (
            meta["clicks"] / meta["impressions"] * 100
            if meta["impressions"] > 0
            else 0
        )
        winner = "Google Ads" if google_ctr > meta_ctr else "Meta Ads"
        insights.append(
            CrossPlatformInsight(
                metric="Click-Through Rate",
                google_value=google_ctr,
                meta_value=meta_ctr,
                winner=winner,
                recommendation=f"{winner} drives higher engagement ({max(google_ctr, meta_ctr):.2f}% vs {min(google_ctr, meta_ctr):.2f}%)",
            )
        )

        # Compare CPA
        google_cpa = (
            google["spend"] / google["conversions"]
            if google["conversions"] > 0
            else float("inf")
        )
        meta_cpa = (
            meta["spend"] / meta["conversions"]
            if meta["conversions"] > 0
            else float("inf")
        )
        if google_cpa != float("inf") and meta_cpa != float("inf"):
            winner = "Google Ads" if google_cpa < meta_cpa else "Meta Ads"
            insights.append(
                CrossPlatformInsight(
                    metric="Cost Per Acquisition",
                    google_value=google_cpa,
                    meta_value=meta_cpa,
                    winner=winner,
                    recommendation=f"{winner} delivers cheaper conversions (${min(google_cpa, meta_cpa):.2f} vs ${max(google_cpa, meta_cpa):.2f})",
                )
            )

        # Compare ROAS
        google_roas = (
            google["conversion_value"] / google["spend"]
            if google["spend"] > 0
            else 0
        )
        meta_roas = (
            meta["conversion_value"] / meta["spend"] if meta["spend"] > 0 else 0
        )
        if google_roas > 0 or meta_roas > 0:
            winner = "Google Ads" if google_roas > meta_roas else "Meta Ads"
            insights.append(
                CrossPlatformInsight(
                    metric="Return on Ad Spend",
                    google_value=google_roas,
                    meta_value=meta_roas,
                    winner=winner,
                    recommendation=f"{winner} provides better ROI ({max(google_roas, meta_roas):.1f}x vs {min(google_roas, meta_roas):.1f}x)",
                )
            )

        return insights
