"""Google Ads sync implementation."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any

import psycopg

from app.integrations.base import BaseIntegration
from .client import create_client, run_query

logger = logging.getLogger(__name__)

# GAQL queries for syncing data
CAMPAIGNS_QUERY = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.campaign_budget,
        campaign.start_date,
        campaign.end_date
    FROM campaign
    WHERE campaign.status != 'REMOVED'
"""

AD_GROUPS_QUERY = """
    SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.type,
        campaign.id
    FROM ad_group
    WHERE ad_group.status != 'REMOVED'
"""

ADS_QUERY = """
    SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.status,
        ad_group_ad.ad.type,
        ad_group.id,
        campaign.id
    FROM ad_group_ad
    WHERE ad_group_ad.status != 'REMOVED'
"""

METRICS_QUERY_TEMPLATE = """
    SELECT
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
"""


class GoogleAdsIntegration(BaseIntegration):
    """Google Ads integration for syncing campaigns, ads, and metrics."""

    def __init__(
        self,
        workspace_id: str,
        integration_id: str,
        credentials: dict[str, Any],
    ):
        super().__init__(workspace_id, integration_id, credentials)
        self.refresh_token = credentials.get("refreshToken")
        if not self.refresh_token:
            raise ValueError("Missing refreshToken in credentials")
        self.client = create_client(self.refresh_token)

    async def sync_all(self, conn: psycopg.AsyncConnection) -> dict[str, Any]:
        """Sync all data for all accounts."""
        accounts = await self.get_ad_accounts(conn)
        results = {
            "accounts_synced": 0,
            "campaigns_synced": 0,
            "ad_groups_synced": 0,
            "ads_synced": 0,
            "errors": [],
        }

        for account in accounts:
            try:
                account_result = await self.sync_account(conn, account["external_id"])
                results["accounts_synced"] += 1
                results["campaigns_synced"] += account_result.get("campaigns", 0)
                results["ad_groups_synced"] += account_result.get("ad_groups", 0)
                results["ads_synced"] += account_result.get("ads", 0)
                await self.update_account_sync_status(conn, account["id"])
            except Exception as e:
                error_msg = f"Account {account['external_id']}: {str(e)}"
                self.logger.error(error_msg)
                results["errors"].append(error_msg)
                await self.update_account_sync_status(conn, account["id"], str(e))

        return results

    async def sync_account(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> dict[str, Any]:
        """Sync data for a specific account."""
        results = {
            "campaigns": 0,
            "ad_groups": 0,
            "ads": 0,
        }

        # Sync campaigns
        results["campaigns"] = await self.sync_campaigns(conn, account_id)

        # Sync ad groups
        results["ad_groups"] = await self._sync_ad_groups(conn, account_id)

        # Sync ads
        results["ads"] = await self._sync_ads(conn, account_id)

        # Sync last 7 days of metrics
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        await self.sync_metrics(conn, account_id, start_date, end_date)

        return results

    async def sync_campaigns(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> int:
        """Sync campaigns for an account."""
        rows = run_query(self.client, account_id, CAMPAIGNS_QUERY)
        count = 0

        for row in rows:
            campaign = row.get("campaign", {})
            external_id = str(campaign.get("id", ""))

            if not external_id:
                continue

            # Upsert campaign
            await conn.execute(
                """
                INSERT INTO campaigns (
                    workspace_id, provider, external_id, name, status,
                    objective, raw_json, created_at, updated_at
                ) VALUES (%s, 'google_ads', %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (workspace_id, provider, external_id)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    objective = EXCLUDED.objective,
                    raw_json = EXCLUDED.raw_json,
                    updated_at = NOW()
                """,
                (
                    self.workspace_id,
                    external_id,
                    campaign.get("name", ""),
                    campaign.get("status", "").lower(),
                    campaign.get("advertisingChannelType", ""),
                    json.dumps(row),
                ),
            )
            count += 1

        return count

    async def _sync_ad_groups(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> int:
        """Sync ad groups for an account."""
        rows = run_query(self.client, account_id, AD_GROUPS_QUERY)
        count = 0

        for row in rows:
            ad_group = row.get("ad_group", {})
            campaign = row.get("campaign", {})
            external_id = str(ad_group.get("id", ""))
            campaign_external_id = str(campaign.get("id", ""))

            if not external_id:
                continue

            # Upsert ad group
            await conn.execute(
                """
                INSERT INTO ad_groups (
                    workspace_id, provider, external_id, campaign_external_id,
                    name, status, raw_json, created_at, updated_at
                ) VALUES (%s, 'google_ads', %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (workspace_id, provider, external_id)
                DO UPDATE SET
                    campaign_external_id = EXCLUDED.campaign_external_id,
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    raw_json = EXCLUDED.raw_json,
                    updated_at = NOW()
                """,
                (
                    self.workspace_id,
                    external_id,
                    campaign_external_id,
                    ad_group.get("name", ""),
                    ad_group.get("status", "").lower(),
                    json.dumps(row),
                ),
            )
            count += 1

        return count

    async def _sync_ads(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> int:
        """Sync ads for an account."""
        rows = run_query(self.client, account_id, ADS_QUERY)
        count = 0

        for row in rows:
            ad_group_ad = row.get("ad_group_ad", {})
            ad = ad_group_ad.get("ad", {})
            ad_group = row.get("ad_group", {})
            external_id = str(ad.get("id", ""))
            ad_group_external_id = str(ad_group.get("id", ""))

            if not external_id:
                continue

            # Upsert ad
            await conn.execute(
                """
                INSERT INTO ads (
                    workspace_id, provider, external_id, ad_group_external_id,
                    name, status, raw_json, created_at, updated_at
                ) VALUES (%s, 'google_ads', %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (workspace_id, provider, external_id)
                DO UPDATE SET
                    ad_group_external_id = EXCLUDED.ad_group_external_id,
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    raw_json = EXCLUDED.raw_json,
                    updated_at = NOW()
                """,
                (
                    self.workspace_id,
                    external_id,
                    ad_group_external_id,
                    ad.get("name", ""),
                    ad_group_ad.get("status", "").lower(),
                    json.dumps(row),
                ),
            )
            count += 1

        return count

    async def sync_metrics(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> int:
        """Sync daily metrics for an account."""
        query = METRICS_QUERY_TEMPLATE.format(
            start_date=start_date,
            end_date=end_date,
        )
        rows = run_query(self.client, account_id, query)
        count = 0

        for row in rows:
            campaign = row.get("campaign", {})
            segments = row.get("segments", {})
            metrics = row.get("metrics", {})

            campaign_external_id = str(campaign.get("id", ""))
            date = segments.get("date", "")

            if not campaign_external_id or not date:
                continue

            # Upsert metrics
            await conn.execute(
                """
                INSERT INTO perf_campaign_daily (
                    workspace_id, provider, campaign_external_id, date,
                    impressions, clicks, spend_micros, conversions, conv_value,
                    ctr, cpc, provider_metrics_jsonb, created_at, updated_at
                ) VALUES (%s, 'google_ads', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (workspace_id, provider, campaign_external_id, date)
                DO UPDATE SET
                    impressions = EXCLUDED.impressions,
                    clicks = EXCLUDED.clicks,
                    spend_micros = EXCLUDED.spend_micros,
                    conversions = EXCLUDED.conversions,
                    conv_value = EXCLUDED.conv_value,
                    ctr = EXCLUDED.ctr,
                    cpc = EXCLUDED.cpc,
                    provider_metrics_jsonb = EXCLUDED.provider_metrics_jsonb,
                    updated_at = NOW()
                """,
                (
                    self.workspace_id,
                    campaign_external_id,
                    date,
                    metrics.get("impressions", 0),
                    metrics.get("clicks", 0),
                    metrics.get("costMicros", 0),
                    metrics.get("conversions", 0.0),
                    metrics.get("conversionsValue", 0.0),
                    metrics.get("ctr", 0.0),
                    metrics.get("averageCpc", 0),
                    json.dumps(metrics),
                ),
            )
            count += 1

        return count
