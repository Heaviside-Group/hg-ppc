"""Google Ads campaign mutation operations."""

import logging
from typing import Any

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

logger = logging.getLogger(__name__)


def update_campaign_status(
    client: GoogleAdsClient,
    customer_id: str,
    campaign_id: str,
    status: str,
    login_customer_id: str | None = None,
) -> dict[str, Any]:
    """Update a campaign's status (enabled/paused).

    Args:
        client: GoogleAdsClient instance.
        customer_id: Customer ID (without hyphens).
        campaign_id: Campaign resource name or ID.
        status: New status ('enabled' or 'paused').
        login_customer_id: Optional manager account ID for MCC access.

    Returns:
        Dict with mutation result.
    """
    campaign_service = client.get_service("CampaignService")

    # Set login customer ID for MCC access if provided
    if login_customer_id:
        client.login_customer_id = login_customer_id

    # Build resource name if only ID provided
    if not campaign_id.startswith("customers/"):
        campaign_resource_name = campaign_service.campaign_path(
            customer_id, campaign_id
        )
    else:
        campaign_resource_name = campaign_id

    # Map our status to Google Ads status enum
    status_enum = client.enums.CampaignStatusEnum
    google_status = (
        status_enum.ENABLED if status == "enabled" else status_enum.PAUSED
    )

    # Create the campaign operation
    campaign_operation = client.get_type("CampaignOperation")
    campaign = campaign_operation.update
    campaign.resource_name = campaign_resource_name
    campaign.status = google_status

    # Set the field mask to indicate what we're updating
    field_mask = client.get_type("FieldMask")
    field_mask.paths.append("status")
    campaign_operation.update_mask.CopyFrom(field_mask)

    try:
        response = campaign_service.mutate_campaigns(
            customer_id=customer_id,
            operations=[campaign_operation],
        )

        result = response.results[0]
        logger.info(
            f"Updated campaign status: {result.resource_name} -> {status}"
        )

        return {
            "success": True,
            "resource_name": result.resource_name,
            "status": status,
        }

    except GoogleAdsException as ex:
        error_msg = ex.failure.errors[0].message if ex.failure.errors else str(ex)
        logger.error(
            f"Failed to update campaign status for {campaign_resource_name}: "
            f"{ex.error.code().name} - {error_msg}"
        )
        raise


def update_campaign_budget(
    client: GoogleAdsClient,
    customer_id: str,
    campaign_id: str,
    daily_budget_micros: int,
    login_customer_id: str | None = None,
) -> dict[str, Any]:
    """Update a campaign's daily budget.

    Note: In Google Ads, budgets are separate resources linked to campaigns.
    We need to find the campaign's budget and update that.

    Args:
        client: GoogleAdsClient instance.
        customer_id: Customer ID (without hyphens).
        campaign_id: Campaign ID (just the numeric ID).
        daily_budget_micros: New daily budget in micros.
        login_customer_id: Optional manager account ID for MCC access.

    Returns:
        Dict with mutation result.
    """
    ga_service = client.get_service("GoogleAdsService")
    campaign_budget_service = client.get_service("CampaignBudgetService")

    # Set login customer ID for MCC access if provided
    if login_customer_id:
        client.login_customer_id = login_customer_id

    # First, find the budget associated with this campaign
    query = f"""
        SELECT campaign.id, campaign.campaign_budget
        FROM campaign
        WHERE campaign.id = {campaign_id}
    """

    try:
        response = ga_service.search(customer_id=customer_id, query=query)
        rows = list(response)

        if not rows:
            raise ValueError(f"Campaign {campaign_id} not found")

        budget_resource_name = rows[0].campaign.campaign_budget

        # Create the budget operation
        budget_operation = client.get_type("CampaignBudgetOperation")
        budget = budget_operation.update
        budget.resource_name = budget_resource_name
        budget.amount_micros = daily_budget_micros

        # Set the field mask
        field_mask = client.get_type("FieldMask")
        field_mask.paths.append("amount_micros")
        budget_operation.update_mask.CopyFrom(field_mask)

        response = campaign_budget_service.mutate_campaign_budgets(
            customer_id=customer_id,
            operations=[budget_operation],
        )

        result = response.results[0]
        budget_dollars = daily_budget_micros / 1_000_000
        logger.info(
            f"Updated campaign budget: {result.resource_name} -> ${budget_dollars:.2f}/day"
        )

        return {
            "success": True,
            "resource_name": result.resource_name,
            "daily_budget_micros": daily_budget_micros,
            "daily_budget": budget_dollars,
        }

    except GoogleAdsException as ex:
        error_msg = ex.failure.errors[0].message if ex.failure.errors else str(ex)
        logger.error(
            f"Failed to update campaign budget for {campaign_id}: "
            f"{ex.error.code().name} - {error_msg}"
        )
        raise
