"""Sync worker - processes data sync jobs from the BullMQ queue."""

import logging
from typing import Any

from bullmq import Worker

from app.config import settings
from app.db import get_db, set_workspace_context

logger = logging.getLogger(__name__)

QUEUE_NAME = "ppc-sync"

_worker: Worker | None = None


async def process_sync_job(job: Any, token: str | None = None) -> dict:
    """Process a sync job.

    In Phase 0, this is a placeholder. In Phase 1, this will:
    - Fetch data from Google Ads or Meta APIs
    - Transform and load into PostgreSQL
    - Update sync_jobs table with status
    """
    job_data = job.data
    job_type = job.name

    logger.info(
        f"Processing sync job {job.id}: type={job_type}, "
        f"workspace={job_data.get('workspaceId')}, "
        f"integration={job_data.get('integrationId')}"
    )

    try:
        workspace_id = job_data.get("workspaceId")
        integration_id = job_data.get("integrationId")

        async with get_db() as conn:
            # Set RLS context
            await set_workspace_context(conn, workspace_id)

            # Update job status to running
            await conn.execute(
                """
                UPDATE sync_jobs
                SET status = 'running', started_at = NOW(), updated_at = NOW()
                WHERE integration_id = %s AND status = 'pending'
                LIMIT 1
                """,
                (integration_id,),
            )

            # Placeholder: Actual sync logic will be implemented in Phase 1
            # For now, just simulate some work
            logger.info(f"Job {job.id}: Would sync data for integration {integration_id}")

            # Update job status to completed
            await conn.execute(
                """
                UPDATE sync_jobs
                SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
                    metadata = jsonb_set(COALESCE(metadata, '{}'), '{message}', '"Phase 0 placeholder"')
                WHERE integration_id = %s AND status = 'running'
                LIMIT 1
                """,
                (integration_id,),
            )

            await conn.commit()

        await job.updateProgress(100)

        return {
            "success": True,
            "message": "Job completed (Phase 0 placeholder)",
            "jobId": job.id,
        }

    except Exception as e:
        logger.error(f"Job {job.id} failed: {e}")

        # Try to update job status to failed
        try:
            async with get_db() as conn:
                await conn.execute(
                    """
                    UPDATE sync_jobs
                    SET status = 'failed', completed_at = NOW(), updated_at = NOW(),
                        error = %s
                    WHERE integration_id = %s AND status IN ('pending', 'running')
                    LIMIT 1
                    """,
                    (str(e), job_data.get("integrationId")),
                )
                await conn.commit()
        except Exception as update_error:
            logger.error(f"Failed to update job status: {update_error}")

        raise


async def start_worker() -> None:
    """Start the BullMQ worker."""
    global _worker

    logger.info(f"Starting sync worker (queue: {QUEUE_NAME})...")

    _worker = Worker(
        QUEUE_NAME,
        process_sync_job,
        {
            "connection": settings.redis_url,
            "concurrency": settings.worker_concurrency,
        },
    )

    logger.info("Sync worker started successfully")

    # Keep the worker running
    try:
        while True:
            await _worker.waitUntilReady()
            # Worker will process jobs automatically
            import asyncio

            await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"Worker error: {e}")
        raise


async def stop_worker() -> None:
    """Stop the BullMQ worker."""
    global _worker

    if _worker:
        logger.info("Stopping sync worker...")
        await _worker.close()
        _worker = None
        logger.info("Sync worker stopped")
