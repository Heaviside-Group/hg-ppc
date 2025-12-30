"""Sync worker - processes data sync jobs from the BullMQ queue."""

import logging
from typing import Any

from bullmq import Worker

from app.config import settings
from app.crypto import decrypt_json
from app.db import get_db, set_workspace_context
from app.integrations import GoogleAdsIntegration, MetaAdsIntegration
from app.workers.heartbeat import start_worker_heartbeat, HeartbeatHandle

logger = logging.getLogger(__name__)

QUEUE_NAME = "ppc-sync"

_worker: Worker | None = None
_heartbeat: HeartbeatHandle | None = None


async def get_integration_credentials(
    conn: Any,
    integration_id: str,
) -> tuple[str, dict[str, Any]]:
    """Get and decrypt integration credentials.

    Args:
        conn: Database connection.
        integration_id: Integration ID.

    Returns:
        Tuple of (provider, decrypted_credentials).
    """
    result = await conn.execute(
        """
        SELECT i.provider, ic.encrypted_blob, ic.iv, ic.auth_tag
        FROM integrations i
        JOIN integration_credentials ic ON ic.integration_id = i.id
        WHERE i.id = %s AND i.status = 'active'
        """,
        (integration_id,),
    )
    row = await result.fetchone()

    if not row:
        raise ValueError(f"Integration {integration_id} not found or not active")

    provider = row["provider"]
    credentials = decrypt_json(
        row["encrypted_blob"],
        row["iv"],
        row["auth_tag"],
    )

    return provider, credentials


async def process_sync_job(job: Any, token: str | None = None) -> dict:
    """Process a sync job.

    Routes to the appropriate integration based on provider type.
    """
    job_data = job.data
    job_type = job.name

    workspace_id = job_data.get("workspaceId")
    integration_id = job_data.get("integrationId")
    provider = job_data.get("provider")

    logger.info(
        f"Processing sync job {job.id}: type={job_type}, "
        f"workspace={workspace_id}, "
        f"integration={integration_id}, "
        f"provider={provider}"
    )

    try:
        async with get_db() as conn:
            # Set RLS context
            await set_workspace_context(conn, workspace_id)

            # Get credentials
            db_provider, credentials = await get_integration_credentials(
                conn, integration_id
            )

            # Verify provider matches
            if provider and db_provider != provider:
                raise ValueError(
                    f"Provider mismatch: job says {provider}, db says {db_provider}"
                )

            # Create integration instance
            if db_provider == "google_ads":
                integration = GoogleAdsIntegration(
                    workspace_id,
                    integration_id,
                    credentials,
                )
            elif db_provider == "meta":
                integration = MetaAdsIntegration(
                    workspace_id,
                    integration_id,
                    credentials,
                )
            else:
                raise ValueError(f"Unsupported provider: {db_provider}")

            # Route to appropriate sync method
            if job_type == "sync_all":
                result = await integration.sync_all(conn)
            elif job_type == "sync_account":
                account_id = job_data.get("adAccountId")
                if not account_id:
                    raise ValueError("sync_account requires adAccountId")
                result = await integration.sync_account(conn, account_id)
            elif job_type == "sync_campaigns":
                account_id = job_data.get("adAccountId")
                if not account_id:
                    raise ValueError("sync_campaigns requires adAccountId")
                count = await integration.sync_campaigns(conn, account_id)
                result = {"campaigns_synced": count}
            elif job_type == "sync_metrics":
                account_id = job_data.get("adAccountId")
                date_range = job_data.get("dateRange", {})
                start_date = date_range.get("startDate")
                end_date = date_range.get("endDate")
                if not account_id or not start_date or not end_date:
                    raise ValueError(
                        "sync_metrics requires adAccountId and dateRange"
                    )
                count = await integration.sync_metrics(
                    conn, account_id, start_date, end_date
                )
                result = {"metrics_synced": count}
            else:
                raise ValueError(f"Unknown job type: {job_type}")

            await conn.commit()

        await job.updateProgress(100)

        logger.info(f"Job {job.id} completed: {result}")

        return {
            "success": True,
            "jobId": job.id,
            **result,
        }

    except Exception as e:
        logger.error(f"Job {job.id} failed: {e}")
        raise


async def start_worker() -> None:
    """Start the BullMQ worker."""
    global _worker
    import asyncio

    logger.info(f"Starting sync worker (queue: {QUEUE_NAME})...")

    _worker = Worker(
        QUEUE_NAME,
        process_sync_job,
        {
            "connection": settings.redis_url,
            "concurrency": settings.worker_concurrency,
        },
    )

    _heartbeat = start_worker_heartbeat(QUEUE_NAME)

    logger.info("Sync worker started successfully")

    # Keep the worker running - worker processes jobs automatically
    try:
        while True:
            await asyncio.sleep(60)
    except Exception as e:
        logger.error(f"Worker error: {e}")
        raise


async def stop_worker() -> None:
    """Stop the BullMQ worker."""
    global _worker, _heartbeat

    if _worker:
        logger.info("Stopping sync worker...")
        await _worker.close()
        _worker = None
        logger.info("Sync worker stopped")

    if _heartbeat:
        await _heartbeat.stop()
        _heartbeat = None
