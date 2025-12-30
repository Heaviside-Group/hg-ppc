"""Insights worker - processes scheduled analysis jobs.

Runs daily analysis for all active workspaces, generating insights
for anomalies, budget recommendations, forecasts, and pacing.
"""

import logging
from typing import Any

from bullmq import Worker, Queue

from app.config import settings
from app.db import get_db, set_workspace_context
from app.analytics.insights import InsightsEngine
from app.workers.heartbeat import start_worker_heartbeat, HeartbeatHandle

logger = logging.getLogger(__name__)

QUEUE_NAME = "ppc-insights"

_worker: Worker | None = None
_queue: Queue | None = None
_heartbeat: HeartbeatHandle | None = None


async def get_active_workspaces(conn: Any) -> list[dict[str, Any]]:
    """Get all active workspaces that have at least one active integration.

    Args:
        conn: Database connection.

    Returns:
        List of workspace records.
    """
    result = await conn.execute(
        """
        SELECT DISTINCT w.id, w.name
        FROM workspaces w
        JOIN integrations i ON i.workspace_id = w.id
        WHERE i.status = 'active'
        """
    )
    rows = await result.fetchall()
    return [{"id": row["id"], "name": row["name"]} for row in rows]


async def get_workspace_campaigns(
    conn: Any,
    workspace_id: str,
) -> list[dict[str, Any]]:
    """Get all campaigns for a workspace.

    Args:
        conn: Database connection.
        workspace_id: Workspace ID.

    Returns:
        List of campaign records.
    """
    result = await conn.execute(
        """
        SELECT id, name, provider, status, daily_budget_micros
        FROM campaigns
        WHERE workspace_id = %s
        """,
        (workspace_id,),
    )
    rows = await result.fetchall()
    return [dict(row) for row in rows]


async def get_workspace_metrics(
    conn: Any,
    workspace_id: str,
    days: int = 60,
) -> list[dict[str, Any]]:
    """Get daily metrics for a workspace.

    Args:
        conn: Database connection.
        workspace_id: Workspace ID.
        days: Number of days of history.

    Returns:
        List of daily metric records.
    """
    result = await conn.execute(
        """
        SELECT
            p.campaign_id,
            c.name as campaign_name,
            c.provider,
            p.date,
            p.impressions,
            p.clicks,
            p.spend_micros,
            p.conversions,
            p.conversion_value
        FROM perf_campaign_daily p
        JOIN campaigns c ON c.id = p.campaign_id
        WHERE p.workspace_id = %s
        AND p.date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY p.date
        """,
        (workspace_id, days),
    )
    rows = await result.fetchall()
    return [dict(row) for row in rows]


async def store_insights(
    conn: Any,
    workspace_id: str,
    insights: dict[str, Any],
) -> None:
    """Store generated insights in the database.

    Creates or updates the workspace_insights record.

    Args:
        conn: Database connection.
        workspace_id: Workspace ID.
        insights: Generated insights data.
    """
    import json

    await conn.execute(
        """
        INSERT INTO workspace_insights (workspace_id, insights_json, generated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (workspace_id)
        DO UPDATE SET
            insights_json = EXCLUDED.insights_json,
            generated_at = NOW()
        """,
        (workspace_id, json.dumps(insights)),
    )


async def process_insights_job(job: Any, token: str | None = None) -> dict:
    """Process an insights analysis job.

    Args:
        job: BullMQ job.
        token: Optional lock token.

    Returns:
        Job result.
    """
    job_data = job.data
    job_type = job.name

    workspace_id = job_data.get("workspaceId")

    logger.info(f"Processing insights job {job.id}: type={job_type}")

    try:
        async with get_db() as conn:
            if job_type == "analyze_all":
                # Run analysis for all active workspaces
                workspaces = await get_active_workspaces(conn)
                results = []

                for i, workspace in enumerate(workspaces):
                    ws_id = workspace["id"]
                    ws_name = workspace["name"]

                    await job.updateProgress(int((i / len(workspaces)) * 100))

                    try:
                        # Set RLS context
                        await set_workspace_context(conn, ws_id)

                        # Get data
                        campaigns = await get_workspace_campaigns(conn, ws_id)
                        metrics = await get_workspace_metrics(conn, ws_id)

                        if not campaigns or not metrics:
                            logger.info(f"Skipping {ws_name}: no data")
                            continue

                        # Generate insights
                        engine = InsightsEngine()
                        insights = engine.generate_insights(campaigns, metrics, ws_id)

                        # Store results
                        from dataclasses import asdict

                        await store_insights(conn, ws_id, asdict(insights))

                        results.append({
                            "workspace_id": ws_id,
                            "workspace_name": ws_name,
                            "health_score": insights.health_score,
                            "anomalies": insights.anomalies.get("total", 0),
                            "recommendations": len(insights.budget_recommendations),
                        })

                        logger.info(
                            f"Generated insights for {ws_name}: "
                            f"health={insights.health_score}"
                        )

                    except Exception as e:
                        logger.error(f"Failed to analyze {ws_name}: {e}")
                        results.append({
                            "workspace_id": ws_id,
                            "workspace_name": ws_name,
                            "error": str(e),
                        })

                await job.updateProgress(100)

                return {
                    "success": True,
                    "workspaces_analyzed": len(results),
                    "results": results,
                }

            elif job_type == "analyze_workspace":
                # Analyze a specific workspace
                if not workspace_id:
                    raise ValueError("workspaceId required for analyze_workspace")

                await set_workspace_context(conn, workspace_id)

                campaigns = await get_workspace_campaigns(conn, workspace_id)
                metrics = await get_workspace_metrics(conn, workspace_id)

                engine = InsightsEngine()
                insights = engine.generate_insights(
                    campaigns, metrics, workspace_id
                )

                from dataclasses import asdict

                await store_insights(conn, workspace_id, asdict(insights))

                await job.updateProgress(100)

                return {
                    "success": True,
                    "workspace_id": workspace_id,
                    "health_score": insights.health_score,
                    "anomalies": insights.anomalies.get("total", 0),
                    "recommendations": len(insights.budget_recommendations),
                }

            else:
                raise ValueError(f"Unknown job type: {job_type}")

    except Exception as e:
        logger.error(f"Insights job {job.id} failed: {e}")
        raise


async def schedule_daily_analysis() -> str:
    """Schedule the daily analysis job.

    Returns:
        Job ID.
    """
    global _queue

    if not _queue:
        _queue = Queue(QUEUE_NAME, {"connection": settings.redis_url})

    job = await _queue.add(
        "analyze_all",
        {},
        {
            "repeat": {
                "pattern": "0 6 * * *",  # Run at 6 AM daily
            },
            "jobId": "daily-insights-analysis",
        },
    )

    return job.id


async def enqueue_workspace_analysis(workspace_id: str) -> str:
    """Enqueue an on-demand analysis for a specific workspace.

    Args:
        workspace_id: Workspace to analyze.

    Returns:
        Job ID.
    """
    global _queue

    if not _queue:
        _queue = Queue(QUEUE_NAME, {"connection": settings.redis_url})

    job = await _queue.add(
        "analyze_workspace",
        {"workspaceId": workspace_id},
        {"jobId": f"analyze_{workspace_id}_{int(__import__('time').time())}"},
    )

    return job.id


async def start_worker() -> None:
    """Start the BullMQ insights worker."""
    global _worker, _heartbeat
    import asyncio

    logger.info(f"Starting insights worker (queue: {QUEUE_NAME})...")

    _worker = Worker(
        QUEUE_NAME,
        process_insights_job,
        {
            "connection": settings.redis_url,
            "concurrency": 1,  # Run one analysis at a time
        },
    )

    _heartbeat = start_worker_heartbeat(QUEUE_NAME)

    # Schedule daily analysis
    try:
        await schedule_daily_analysis()
        logger.info("Scheduled daily insights analysis at 6 AM")
    except Exception as e:
        logger.warning(f"Could not schedule daily analysis: {e}")

    logger.info("Insights worker started successfully")

    # Keep the worker running
    try:
        while True:
            await asyncio.sleep(60)
    except Exception as e:
        logger.error(f"Insights worker error: {e}")
        raise


async def stop_worker() -> None:
    """Stop the BullMQ insights worker."""
    global _worker, _queue, _heartbeat

    if _worker:
        logger.info("Stopping insights worker...")
        await _worker.close()
        _worker = None
        logger.info("Insights worker stopped")

    if _queue:
        await _queue.close()
        _queue = None

    if _heartbeat:
        await _heartbeat.stop()
        _heartbeat = None
