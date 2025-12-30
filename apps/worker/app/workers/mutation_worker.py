"""Mutation worker - processes campaign mutation jobs from the BullMQ queue."""

import logging
from typing import Any

from bullmq import Worker

from app.config import settings
from app.crypto import decrypt_json
from app.db import get_db, set_workspace_context
from app.integrations.google_ads.client import create_client as create_google_client
from app.integrations.google_ads.mutations import (
    update_campaign_status as google_update_status,
    update_campaign_budget as google_update_budget,
)
from app.integrations.meta_ads.mutations import (
    update_campaign_status as meta_update_status,
    update_campaign_budget as meta_update_budget,
)
from app.workers.heartbeat import start_worker_heartbeat, HeartbeatHandle

logger = logging.getLogger(__name__)

QUEUE_NAME = "ppc-mutation"

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
        SELECT i.provider, i.manager_account_id, ic.encrypted_blob, ic.iv, ic.auth_tag
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
    manager_account_id = row.get("manager_account_id")
    credentials = decrypt_json(
        row["encrypted_blob"],
        row["iv"],
        row["auth_tag"],
    )
    credentials["manager_account_id"] = manager_account_id

    return provider, credentials


async def get_ad_account_external_id(
    conn: Any,
    ad_account_id: str,
) -> str:
    """Get the external ID for an ad account.

    Args:
        conn: Database connection.
        ad_account_id: Our internal ad account ID.

    Returns:
        External ad account ID (e.g., Google customer ID or Meta act_xxx).
    """
    result = await conn.execute(
        """
        SELECT external_id FROM ad_accounts WHERE id = %s
        """,
        (ad_account_id,),
    )
    row = await result.fetchone()

    if not row:
        raise ValueError(f"Ad account {ad_account_id} not found")

    return row["external_id"]


async def process_mutation_job(job: Any, token: str | None = None) -> dict:
    """Process a mutation job.

    Routes to the appropriate mutation handler based on provider and job type.
    """
    job_data = job.data
    job_type = job.name

    workspace_id = job_data.get("workspaceId")
    integration_id = job_data.get("integrationId")
    campaign_id = job_data.get("campaignId")
    external_campaign_id = job_data.get("externalCampaignId")
    ad_account_id = job_data.get("adAccountId")
    provider = job_data.get("provider")
    payload = job_data.get("payload", {})

    logger.info(
        f"Processing mutation job {job.id}: type={job_type}, "
        f"campaign={campaign_id}, "
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

            # Get external ad account ID
            external_account_id = await get_ad_account_external_id(
                conn, ad_account_id
            )

            # Route to appropriate handler
            if db_provider == "google_ads":
                result = await process_google_mutation(
                    job_type,
                    credentials,
                    external_account_id,
                    external_campaign_id,
                    payload,
                )
            elif db_provider == "meta":
                result = await process_meta_mutation(
                    job_type,
                    credentials,
                    external_campaign_id,
                    payload,
                )
            else:
                raise ValueError(f"Unsupported provider: {db_provider}")

        await job.updateProgress(100)
        logger.info(f"Mutation job {job.id} completed: {result}")

        return {
            "success": True,
            "jobId": job.id,
            **result,
        }

    except Exception as e:
        logger.error(f"Mutation job {job.id} failed: {e}")
        raise


async def process_google_mutation(
    job_type: str,
    credentials: dict[str, Any],
    customer_id: str,
    campaign_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Process a Google Ads mutation.

    Args:
        job_type: Type of mutation job.
        credentials: Decrypted Google Ads credentials.
        customer_id: Google Ads customer ID.
        campaign_id: External campaign ID.
        payload: Job payload with mutation details.

    Returns:
        Mutation result.
    """
    refresh_token = credentials.get("refreshToken")
    manager_account_id = credentials.get("manager_account_id")

    if not refresh_token:
        raise ValueError("Missing refresh token in credentials")

    # Create client
    client = create_google_client(refresh_token)

    # Clean up customer ID (remove hyphens if present)
    customer_id = customer_id.replace("-", "")

    if job_type == "update_campaign_status":
        status = payload.get("status")
        if not status:
            raise ValueError("Missing status in payload")

        return google_update_status(
            client,
            customer_id,
            campaign_id,
            status,
            login_customer_id=manager_account_id,
        )

    elif job_type == "update_campaign_budget":
        budget_micros = payload.get("dailyBudgetMicros")
        if budget_micros is None:
            raise ValueError("Missing dailyBudgetMicros in payload")

        return google_update_budget(
            client,
            customer_id,
            campaign_id,
            budget_micros,
            login_customer_id=manager_account_id,
        )

    else:
        raise ValueError(f"Unknown Google mutation job type: {job_type}")


async def process_meta_mutation(
    job_type: str,
    credentials: dict[str, Any],
    campaign_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Process a Meta Ads mutation.

    Args:
        job_type: Type of mutation job.
        credentials: Decrypted Meta credentials.
        campaign_id: External campaign ID.
        payload: Job payload with mutation details.

    Returns:
        Mutation result.
    """
    access_token = credentials.get("accessToken")

    if not access_token:
        raise ValueError("Missing access token in credentials")

    if job_type == "update_campaign_status":
        status = payload.get("status")
        if not status:
            raise ValueError("Missing status in payload")

        return await meta_update_status(
            access_token,
            campaign_id,
            status,
        )

    elif job_type == "update_campaign_budget":
        budget_micros = payload.get("dailyBudgetMicros")
        if budget_micros is None:
            raise ValueError("Missing dailyBudgetMicros in payload")

        return await meta_update_budget(
            access_token,
            campaign_id,
            budget_micros,
        )

    else:
        raise ValueError(f"Unknown Meta mutation job type: {job_type}")


async def start_worker() -> None:
    """Start the BullMQ mutation worker."""
    global _worker
    import asyncio

    logger.info(f"Starting mutation worker (queue: {QUEUE_NAME})...")

    _worker = Worker(
        QUEUE_NAME,
        process_mutation_job,
        {
            "connection": settings.redis_url,
            "concurrency": settings.worker_concurrency,
        },
    )

    _heartbeat = start_worker_heartbeat(QUEUE_NAME)

    logger.info("Mutation worker started successfully")

    # Keep the worker running
    try:
        while True:
            await asyncio.sleep(60)
    except Exception as e:
        logger.error(f"Mutation worker error: {e}")
        raise


async def stop_worker() -> None:
    """Stop the BullMQ mutation worker."""
    global _worker, _heartbeat

    if _worker:
        logger.info("Stopping mutation worker...")
        await _worker.close()
        _worker = None
        logger.info("Mutation worker stopped")

    if _heartbeat:
        await _heartbeat.stop()
        _heartbeat = None
