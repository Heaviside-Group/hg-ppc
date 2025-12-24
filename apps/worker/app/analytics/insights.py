"""Insights engine - orchestrates all analytics modules.

Provides a unified interface for generating AI-powered insights
from campaign performance data.
"""

import logging
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from typing import Any

from app.analytics.anomaly_detection import AnomalyDetector, Anomaly
from app.analytics.budget_optimizer import (
    BudgetOptimizer,
    BudgetRecommendation,
    CrossPlatformInsight,
)
from app.analytics.forecasting import PerformanceForecaster, Forecast, PacingStatus

logger = logging.getLogger(__name__)


@dataclass
class InsightsSummary:
    """Summary of all insights for a workspace."""

    generated_at: str
    period_start: str
    period_end: str
    anomalies: dict[str, Any]
    budget_recommendations: list[dict[str, Any]]
    forecasts: list[dict[str, Any]]
    pacing: list[dict[str, Any]]
    cross_platform: list[dict[str, Any]]
    health_score: float
    key_insights: list[str]


class InsightsEngine:
    """Orchestrates analytics and generates comprehensive insights."""

    def __init__(
        self,
        lookback_days: int = 30,
        forecast_days: int = 30,
    ):
        """Initialize the insights engine.

        Args:
            lookback_days: Days of historical data to analyze.
            forecast_days: Days to forecast ahead.
        """
        self.anomaly_detector = AnomalyDetector(lookback_days=lookback_days)
        self.budget_optimizer = BudgetOptimizer(lookback_days=lookback_days)
        self.forecaster = PerformanceForecaster(
            lookback_days=lookback_days,
            forecast_days=forecast_days,
        )
        self.lookback_days = lookback_days

    def generate_insights(
        self,
        campaigns: list[dict[str, Any]],
        daily_metrics: list[dict[str, Any]],
        workspace_id: str,
    ) -> InsightsSummary:
        """Generate comprehensive insights for a workspace.

        Args:
            campaigns: List of campaign records.
            daily_metrics: Historical daily metrics.
            workspace_id: Workspace identifier.

        Returns:
            Complete insights summary.
        """
        today = date.today()
        period_start = today - timedelta(days=self.lookback_days)

        logger.info(f"Generating insights for workspace {workspace_id}")

        # Detect anomalies
        anomalies = self.anomaly_detector.detect_anomalies(daily_metrics)
        anomaly_summary = self.anomaly_detector.get_anomaly_summary(anomalies)

        # Generate budget recommendations
        budget_recs = self.budget_optimizer.generate_recommendations(
            campaigns,
            daily_metrics,
        )

        # Cross-platform insights
        cross_platform = self.budget_optimizer.get_cross_platform_insights(
            daily_metrics
        )

        # Generate forecasts
        forecasts = self.forecaster.generate_forecasts(daily_metrics)

        # Calculate pacing
        pacing = self.forecaster.calculate_pacing(campaigns, daily_metrics)

        # Calculate health score
        health_score = self._calculate_health_score(
            anomalies,
            budget_recs,
            pacing,
        )

        # Generate key insights
        key_insights = self._generate_key_insights(
            anomalies,
            budget_recs,
            forecasts,
            pacing,
            cross_platform,
        )

        return InsightsSummary(
            generated_at=today.isoformat(),
            period_start=period_start.isoformat(),
            period_end=today.isoformat(),
            anomalies=anomaly_summary,
            budget_recommendations=[self._rec_to_dict(r) for r in budget_recs],
            forecasts=[self._forecast_to_dict(f) for f in forecasts],
            pacing=[self._pacing_to_dict(p) for p in pacing],
            cross_platform=[self._cross_platform_to_dict(c) for c in cross_platform],
            health_score=health_score,
            key_insights=key_insights,
        )

    def _calculate_health_score(
        self,
        anomalies: list[Anomaly],
        budget_recs: list[BudgetRecommendation],
        pacing: list[PacingStatus],
    ) -> float:
        """Calculate overall account health score (0-100).

        Higher is better. Deductions for:
        - Critical anomalies
        - High-priority budget recommendations
        - Pacing issues
        """
        score = 100.0

        # Deduct for anomalies
        critical_count = sum(1 for a in anomalies if a.severity == "critical")
        warning_count = sum(1 for a in anomalies if a.severity == "warning")
        score -= critical_count * 10
        score -= warning_count * 3

        # Deduct for budget issues
        high_priority = sum(1 for r in budget_recs if r.priority == "high")
        score -= high_priority * 5

        # Deduct for pacing issues
        pacing_issues = sum(1 for p in pacing if p.pacing_status != "on_track")
        score -= pacing_issues * 5

        return max(0, min(100, score))

    def _generate_key_insights(
        self,
        anomalies: list[Anomaly],
        budget_recs: list[BudgetRecommendation],
        forecasts: list[Forecast],
        pacing: list[PacingStatus],
        cross_platform: list[CrossPlatformInsight],
    ) -> list[str]:
        """Generate top key insights as human-readable strings."""
        insights = []

        # Anomaly insights
        critical_anomalies = [a for a in anomalies if a.severity == "critical"]
        if critical_anomalies:
            insights.append(
                f"🚨 {len(critical_anomalies)} critical performance anomalies detected"
            )
            insights.append(f"   → {critical_anomalies[0].message}")

        # Budget insights
        increase_recs = [r for r in budget_recs if r.change_pct > 0]
        decrease_recs = [r for r in budget_recs if r.change_pct < 0]

        if increase_recs:
            total_increase = sum(r.change_amount for r in increase_recs)
            insights.append(
                f"📈 Recommended to increase budget by ${total_increase:.0f}/day across {len(increase_recs)} campaigns"
            )

        if decrease_recs:
            total_decrease = abs(sum(r.change_amount for r in decrease_recs))
            insights.append(
                f"📉 Recommended to reduce budget by ${total_decrease:.0f}/day across {len(decrease_recs)} underperforming campaigns"
            )

        # Forecast insights
        spend_forecast = next((f for f in forecasts if f.metric == "spend"), None)
        conv_forecast = next(
            (f for f in forecasts if f.metric == "conversions"), None
        )

        if spend_forecast and spend_forecast.trend != "stable":
            direction = "increasing" if spend_forecast.trend == "up" else "decreasing"
            insights.append(
                f"📊 Spend is {direction} {abs(spend_forecast.trend_pct):.1f}% daily"
            )

        if conv_forecast:
            insights.append(
                f"🎯 Projected {conv_forecast.next_period_forecast:.0f} conversions next month "
                f"({conv_forecast.confidence} confidence)"
            )

        # Pacing insights
        overspending = [p for p in pacing if p.pacing_status == "overspending"]
        underspending = [p for p in pacing if p.pacing_status == "underspending"]

        if overspending:
            total_over = sum(p.projected_variance for p in overspending)
            insights.append(
                f"⚠️ {len(overspending)} campaigns projected to overspend by ${total_over:.0f}"
            )

        if underspending:
            total_under = abs(sum(p.projected_variance for p in underspending))
            insights.append(
                f"💡 ${total_under:.0f} in unspent budget opportunity across {len(underspending)} campaigns"
            )

        # Cross-platform insights
        if cross_platform:
            best_platform = cross_platform[0]  # First is usually most important
            insights.append(
                f"🔄 {best_platform.winner} leads on {best_platform.metric}"
            )

        return insights[:8]  # Limit to top 8 insights

    def _rec_to_dict(self, rec: BudgetRecommendation) -> dict[str, Any]:
        """Convert recommendation to dict."""
        return {
            "campaign_id": rec.campaign_id,
            "campaign_name": rec.campaign_name,
            "provider": rec.provider,
            "current_budget": rec.current_budget,
            "recommended_budget": rec.recommended_budget,
            "change_amount": rec.change_amount,
            "change_pct": rec.change_pct,
            "reason": rec.reason,
            "efficiency_score": rec.efficiency_score,
            "priority": rec.priority,
            "expected_impact": rec.expected_impact,
        }

    def _forecast_to_dict(self, forecast: Forecast) -> dict[str, Any]:
        """Convert forecast to dict."""
        return {
            "metric": forecast.metric,
            "metric_name": forecast.metric_name,
            "current_period_actual": forecast.current_period_actual,
            "current_period_projected": forecast.current_period_projected,
            "next_period_forecast": forecast.next_period_forecast,
            "trend": forecast.trend,
            "trend_pct": forecast.trend_pct,
            "confidence": forecast.confidence,
        }

    def _pacing_to_dict(self, pacing: PacingStatus) -> dict[str, Any]:
        """Convert pacing status to dict."""
        return {
            "campaign_id": pacing.campaign_id,
            "campaign_name": pacing.campaign_name,
            "provider": pacing.provider,
            "period_budget": pacing.period_budget,
            "spent_to_date": pacing.spent_to_date,
            "days_elapsed": pacing.days_elapsed,
            "days_remaining": pacing.days_remaining,
            "pacing_status": pacing.pacing_status,
            "projected_spend": pacing.projected_spend,
            "projected_variance": pacing.projected_variance,
            "recommendation": pacing.recommendation,
        }

    def _cross_platform_to_dict(self, insight: CrossPlatformInsight) -> dict[str, Any]:
        """Convert cross-platform insight to dict."""
        return {
            "metric": insight.metric,
            "google_value": insight.google_value,
            "meta_value": insight.meta_value,
            "winner": insight.winner,
            "recommendation": insight.recommendation,
        }


async def run_insights_analysis(
    workspace_id: str,
    db_conn: Any,
) -> dict[str, Any]:
    """Run full insights analysis for a workspace.

    This is the main entry point called by the worker.

    Args:
        workspace_id: Workspace to analyze.
        db_conn: Database connection.

    Returns:
        Insights summary as dict.
    """
    # Fetch campaigns
    campaigns_result = await db_conn.execute(
        """
        SELECT id, name, provider, status, daily_budget_micros
        FROM campaigns
        WHERE workspace_id = %s AND status = 'enabled'
        """,
        (workspace_id,),
    )
    campaigns = [dict(row) for row in await campaigns_result.fetchall()]

    # Fetch daily metrics (last 60 days for forecasting)
    metrics_result = await db_conn.execute(
        """
        SELECT
            campaign_id,
            c.name as campaign_name,
            c.provider,
            date,
            impressions,
            clicks,
            spend_micros,
            conversions,
            conversion_value
        FROM perf_campaign_daily p
        JOIN campaigns c ON c.id = p.campaign_id
        WHERE p.workspace_id = %s
        AND date >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY date
        """,
        (workspace_id,),
    )
    daily_metrics = [dict(row) for row in await metrics_result.fetchall()]

    # Generate insights
    engine = InsightsEngine()
    summary = engine.generate_insights(campaigns, daily_metrics, workspace_id)

    return asdict(summary)
