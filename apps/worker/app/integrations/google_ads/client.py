"""Google Ads API client wrapper."""

import logging
from typing import Any

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

from app.config import settings

logger = logging.getLogger(__name__)


def create_client(refresh_token: str) -> GoogleAdsClient:
    """Create a Google Ads client with the provided refresh token.

    Args:
        refresh_token: OAuth refresh token.

    Returns:
        Configured GoogleAdsClient instance.
    """
    credentials = {
        "developer_token": settings.google_ads_developer_token,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": refresh_token,
        "use_proto_plus": True,
    }

    return GoogleAdsClient.load_from_dict(credentials)


async def refresh_access_token(refresh_token: str) -> tuple[str, int]:
    """Refresh the access token using the refresh token.

    Args:
        refresh_token: OAuth refresh token.

    Returns:
        Tuple of (access_token, expires_in_seconds).
    """
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "refresh_token": refresh_token,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["access_token"], data["expires_in"]


def run_query(
    client: GoogleAdsClient,
    customer_id: str,
    query: str,
    login_customer_id: str | None = None,
) -> list[dict[str, Any]]:
    """Execute a GAQL query and return results as dicts.

    Args:
        client: GoogleAdsClient instance.
        customer_id: Customer ID to query (without hyphens).
        query: GAQL query string.
        login_customer_id: Optional manager account ID for MCC access.

    Returns:
        List of result rows as dictionaries.
    """
    ga_service = client.get_service("GoogleAdsService")

    # Set login customer ID for MCC access if provided
    if login_customer_id:
        client.login_customer_id = login_customer_id

    try:
        response = ga_service.search(customer_id=customer_id, query=query)
        results = []
        for row in response:
            results.append(_row_to_dict(row))
        return results
    except GoogleAdsException as ex:
        logger.error(
            f"Google Ads API error for customer {customer_id}: "
            f"{ex.error.code().name} - {ex.failure.errors[0].message}"
        )
        raise


def _row_to_dict(row: Any) -> dict[str, Any]:
    """Convert a Google Ads row to a dictionary.

    Args:
        row: Google Ads row object.

    Returns:
        Dictionary representation.
    """
    # The row is a protobuf message, convert to dict
    from google.protobuf.json_format import MessageToDict

    return MessageToDict(row._pb, preserving_proto_field_name=True)
