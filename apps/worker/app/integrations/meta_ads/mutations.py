"""Meta (Facebook) Ads campaign mutation operations."""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


async def update_campaign_status(
    access_token: str,
    campaign_id: str,
    status: str,
) -> dict[str, Any]:
    """Update a campaign's status (enabled/paused).

    Args:
        access_token: Meta access token.
        campaign_id: Campaign ID.
        status: New status ('enabled' or 'paused').

    Returns:
        Dict with mutation result.
    """
    # Map our status to Meta's status values
    # Meta uses: ACTIVE, PAUSED, DELETED, ARCHIVED
    meta_status = "ACTIVE" if status == "enabled" else "PAUSED"

    url = f"{GRAPH_API_BASE}/{campaign_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            data={
                "access_token": access_token,
                "status": meta_status,
            },
        )

        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", response.text)
            logger.error(
                f"Failed to update Meta campaign status for {campaign_id}: {error_msg}"
            )
            response.raise_for_status()

        result = response.json()
        logger.info(f"Updated Meta campaign status: {campaign_id} -> {status}")

        return {
            "success": result.get("success", True),
            "campaign_id": campaign_id,
            "status": status,
        }


async def update_campaign_budget(
    access_token: str,
    campaign_id: str,
    daily_budget_micros: int,
) -> dict[str, Any]:
    """Update a campaign's daily budget.

    Note: In Meta Ads, daily_budget is in cents (not micros).
    We convert from micros (millionths of a dollar) to cents.

    Args:
        access_token: Meta access token.
        campaign_id: Campaign ID.
        daily_budget_micros: New daily budget in micros.

    Returns:
        Dict with mutation result.
    """
    # Convert micros to cents (Meta uses cents)
    # 1 dollar = 1,000,000 micros = 100 cents
    # So: cents = micros / 10,000
    daily_budget_cents = daily_budget_micros // 10_000

    url = f"{GRAPH_API_BASE}/{campaign_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            data={
                "access_token": access_token,
                "daily_budget": daily_budget_cents,
            },
        )

        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", response.text)
            logger.error(
                f"Failed to update Meta campaign budget for {campaign_id}: {error_msg}"
            )
            response.raise_for_status()

        result = response.json()
        budget_dollars = daily_budget_micros / 1_000_000
        logger.info(
            f"Updated Meta campaign budget: {campaign_id} -> ${budget_dollars:.2f}/day"
        )

        return {
            "success": result.get("success", True),
            "campaign_id": campaign_id,
            "daily_budget_micros": daily_budget_micros,
            "daily_budget": budget_dollars,
        }
