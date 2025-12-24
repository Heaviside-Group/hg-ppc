"""Meta Ads sync implementation."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any

import psycopg

from app.integrations.base import BaseIntegration
from .client import MetaAdsClient

logger = logging.getLogger(__name__)


class MetaAdsIntegration(BaseIntegration):
    """Meta Ads integration for syncing campaigns, ads, and metrics."""

    def __init__(
        self,
        workspace_id: str,
        integration_id: str,
        credentials: dict[str, Any],
    ):
        super().__init__(workspace_id, integration_id, credentials)
        self.access_token = credentials.get("accessToken")
        self.expires_at = credentials.get("expiresAt")

        if not self.access_token:
            raise ValueError("Missing accessToken in credentials")

        # Check if token is expired
        if self.expires_at:
            expires = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
            if expires < datetime.now(expires.tzinfo):
                raise ValueError("Access token has expired")

        self.client = MetaAdsClient(self.access_token)

    async def sync_all(self, conn: psycopg.AsyncConnection) -> dict[str, Any]:
        """Sync all data for all accounts."""
        accounts = await self.get_ad_accounts(conn)
        results = {
            "accounts_synced": 0,
            "campaigns_synced": 0,
            "ad_sets_synced": 0,
            "ads_synced": 0,
            "errors": [],
        }

        try:
            for account in accounts:
                try:
                    account_result = await self.sync_account(
                        conn, account["external_id"]
                    )
                    results["accounts_synced"] += 1
                    results["campaigns_synced"] += account_result.get("campaigns", 0)
                    results["ad_sets_synced"] += account_result.get("ad_sets", 0)
                    results["ads_synced"] += account_result.get("ads", 0)
                    await self.update_account_sync_status(conn, account["id"])
                except Exception as e:
                    error_msg = f"Account {account['external_id']}: {str(e)}"
                    self.logger.error(error_msg)
                    results["errors"].append(error_msg)
                    await self.update_account_sync_status(conn, account["id"], str(e))
        finally:
            await self.client.close()

        return results

    async def sync_account(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> dict[str, Any]:
        """Sync data for a specific account."""
        results = {
            "campaigns": 0,
            "ad_sets": 0,
            "ads": 0,
        }

        # Sync campaigns
        results["campaigns"] = await self.sync_campaigns(conn, account_id)

        # Sync ad sets (equivalent to ad groups)
        results["ad_sets"] = await self._sync_ad_sets(conn, account_id)

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
        campaigns = await self.client.get_campaigns(account_id)
        count = 0

        for campaign in campaigns:
            external_id = campaign.get("id", "")

            if not external_id:
                continue

            # Map Meta status to our status
            status = self._map_status(campaign.get("effective_status", ""))

            # Upsert campaign
            await conn.execute(
                """
                INSERT INTO campaigns (
                    workspace_id, provider, external_id, name, status,
                    objective, raw_json, created_at, updated_at
                ) VALUES (%s, 'meta', %s, %s, %s, %s, %s, NOW(), NOW())
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
                    status,
                    campaign.get("objective", ""),
                    json.dumps(campaign),
                ),
            )
            count += 1

        return count

    async def _sync_ad_sets(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> int:
        """Sync ad sets for an account."""
        adsets = await self.client.get_adsets(account_id)
        count = 0

        for adset in adsets:
            external_id = adset.get("id", "")
            campaign_id = adset.get("campaign_id", "")

            if not external_id:
                continue

            status = self._map_status(adset.get("effective_status", ""))

            # Upsert ad set (stored as ad_group)
            await conn.execute(
                """
                INSERT INTO ad_groups (
                    workspace_id, provider, external_id, campaign_external_id,
                    name, status, raw_json, created_at, updated_at
                ) VALUES (%s, 'meta', %s, %s, %s, %s, %s, NOW(), NOW())
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
                    campaign_id,
                    adset.get("name", ""),
                    status,
                    json.dumps(adset),
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
        ads = await self.client.get_ads(account_id)
        count = 0

        for ad in ads:
            external_id = ad.get("id", "")
            adset_id = ad.get("adset_id", "")

            if not external_id:
                continue

            status = self._map_status(ad.get("effective_status", ""))

            # Upsert ad
            await conn.execute(
                """
                INSERT INTO ads (
                    workspace_id, provider, external_id, ad_group_external_id,
                    name, status, raw_json, created_at, updated_at
                ) VALUES (%s, 'meta', %s, %s, %s, %s, %s, NOW(), NOW())
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
                    adset_id,
                    ad.get("name", ""),
                    status,
                    json.dumps(ad),
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
        insights = await self.client.get_insights(
            account_id,
            start_date,
            end_date,
            level="campaign",
        )
        count = 0

        for insight in insights:
            campaign_id = insight.get("campaign_id", "")
            date = insight.get("date_start", "")

            if not campaign_id or not date:
                continue

            # Convert spend to micros (Meta returns in currency units)
            spend = float(insight.get("spend", 0))
            spend_micros = int(spend * 1_000_000)

            # Convert CPC to micros
            cpc = float(insight.get("cpc", 0) or 0)
            cpc_micros = int(cpc * 1_000_000)

            # Upsert metrics
            await conn.execute(
                """
                INSERT INTO perf_campaign_daily (
                    workspace_id, provider, campaign_external_id, date,
                    impressions, clicks, spend_micros, conversions, conv_value,
                    ctr, cpc, provider_metrics_jsonb, created_at, updated_at
                ) VALUES (%s, 'meta', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
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
                    campaign_id,
                    date,
                    int(insight.get("impressions", 0)),
                    int(insight.get("clicks", 0)),
                    spend_micros,
                    float(insight.get("conversions", 0) or 0),
                    float(insight.get("conversion_values", 0) or 0),
                    float(insight.get("ctr", 0) or 0),
                    cpc_micros,
                    json.dumps(insight),
                ),
            )
            count += 1

        return count

    @staticmethod
    def _map_status(meta_status: str) -> str:
        """Map Meta status to our standard status values."""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "DELETED": "removed",
            "ARCHIVED": "removed",
            "IN_PROCESS": "pending",
            "WITH_ISSUES": "error",
            "PENDING_REVIEW": "pending",
            "DISAPPROVED": "error",
            "PREAPPROVED": "pending",
            "PENDING_BILLING_INFO": "pending",
            "CAMPAIGN_PAUSED": "paused",
            "ADSET_PAUSED": "paused",
        }
        return status_map.get(meta_status, "unknown")
