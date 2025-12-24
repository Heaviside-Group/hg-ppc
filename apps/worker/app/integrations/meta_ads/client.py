"""Meta (Facebook) Ads API client wrapper."""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class MetaAdsClient:
    """HTTP client for Meta Graph API."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()

    async def get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make a GET request to the Graph API.

        Args:
            endpoint: API endpoint (e.g., "/act_123456789/campaigns").
            params: Query parameters.

        Returns:
            JSON response data.
        """
        if params is None:
            params = {}
        params["access_token"] = self.access_token

        url = f"{GRAPH_API_BASE}{endpoint}"
        response = await self.client.get(url, params=params)

        if response.status_code != 200:
            logger.error(
                f"Meta API error: {response.status_code} - {response.text}"
            )
            response.raise_for_status()

        return response.json()

    async def get_paginated(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Get all results from a paginated endpoint.

        Args:
            endpoint: API endpoint.
            params: Query parameters.
            limit: Results per page.

        Returns:
            List of all results.
        """
        if params is None:
            params = {}
        params["limit"] = limit

        results = []
        next_url = None

        while True:
            if next_url:
                # Use the full URL for pagination
                response = await self.client.get(
                    next_url,
                    params={"access_token": self.access_token},
                )
                response.raise_for_status()
                data = response.json()
            else:
                data = await self.get(endpoint, params)

            if "data" in data:
                results.extend(data["data"])

            # Check for next page
            paging = data.get("paging", {})
            next_url = paging.get("next")

            if not next_url:
                break

        return results

    async def get_campaigns(
        self,
        ad_account_id: str,
        fields: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Get campaigns for an ad account.

        Args:
            ad_account_id: Ad account ID (format: act_123456789).
            fields: Fields to retrieve.

        Returns:
            List of campaign objects.
        """
        if fields is None:
            fields = [
                "id",
                "name",
                "status",
                "effective_status",
                "objective",
                "created_time",
                "updated_time",
                "daily_budget",
                "lifetime_budget",
            ]

        return await self.get_paginated(
            f"/{ad_account_id}/campaigns",
            {"fields": ",".join(fields)},
        )

    async def get_adsets(
        self,
        ad_account_id: str,
        fields: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Get ad sets for an ad account.

        Args:
            ad_account_id: Ad account ID (format: act_123456789).
            fields: Fields to retrieve.

        Returns:
            List of ad set objects.
        """
        if fields is None:
            fields = [
                "id",
                "name",
                "status",
                "effective_status",
                "campaign_id",
                "created_time",
                "updated_time",
                "daily_budget",
                "lifetime_budget",
                "targeting",
            ]

        return await self.get_paginated(
            f"/{ad_account_id}/adsets",
            {"fields": ",".join(fields)},
        )

    async def get_ads(
        self,
        ad_account_id: str,
        fields: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Get ads for an ad account.

        Args:
            ad_account_id: Ad account ID (format: act_123456789).
            fields: Fields to retrieve.

        Returns:
            List of ad objects.
        """
        if fields is None:
            fields = [
                "id",
                "name",
                "status",
                "effective_status",
                "adset_id",
                "campaign_id",
                "created_time",
                "updated_time",
                "creative",
            ]

        return await self.get_paginated(
            f"/{ad_account_id}/ads",
            {"fields": ",".join(fields)},
        )

    async def get_insights(
        self,
        ad_account_id: str,
        start_date: str,
        end_date: str,
        level: str = "campaign",
        fields: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Get insights (metrics) for an ad account.

        Args:
            ad_account_id: Ad account ID (format: act_123456789).
            start_date: Start date (YYYY-MM-DD).
            end_date: End date (YYYY-MM-DD).
            level: Breakdown level (account, campaign, adset, ad).
            fields: Metrics to retrieve.

        Returns:
            List of insight objects.
        """
        if fields is None:
            fields = [
                "campaign_id",
                "campaign_name",
                "impressions",
                "clicks",
                "spend",
                "ctr",
                "cpc",
                "conversions",
                "conversion_values",
                "reach",
                "frequency",
            ]

        return await self.get_paginated(
            f"/{ad_account_id}/insights",
            {
                "fields": ",".join(fields),
                "time_range": f'{{"since":"{start_date}","until":"{end_date}"}}',
                "time_increment": 1,  # Daily breakdown
                "level": level,
            },
        )
