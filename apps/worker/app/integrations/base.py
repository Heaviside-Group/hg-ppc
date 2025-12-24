"""Base integration class for ad platform sync."""

import logging
from abc import ABC, abstractmethod
from typing import Any

import psycopg

logger = logging.getLogger(__name__)


class BaseIntegration(ABC):
    """Base class for ad platform integrations."""

    def __init__(
        self,
        workspace_id: str,
        integration_id: str,
        credentials: dict[str, Any],
    ):
        self.workspace_id = workspace_id
        self.integration_id = integration_id
        self.credentials = credentials
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    async def sync_all(self, conn: psycopg.AsyncConnection) -> dict[str, Any]:
        """Sync all data for all accounts.

        Returns:
            dict with sync results including counts and any errors.
        """
        pass

    @abstractmethod
    async def sync_account(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> dict[str, Any]:
        """Sync data for a specific account.

        Args:
            conn: Database connection.
            account_id: External account ID.

        Returns:
            dict with sync results.
        """
        pass

    @abstractmethod
    async def sync_campaigns(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
    ) -> int:
        """Sync campaigns for an account.

        Args:
            conn: Database connection.
            account_id: External account ID.

        Returns:
            Number of campaigns synced.
        """
        pass

    @abstractmethod
    async def sync_metrics(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> int:
        """Sync daily metrics for an account.

        Args:
            conn: Database connection.
            account_id: External account ID.
            start_date: Start date (YYYY-MM-DD).
            end_date: End date (YYYY-MM-DD).

        Returns:
            Number of metric rows synced.
        """
        pass

    async def get_ad_accounts(
        self,
        conn: psycopg.AsyncConnection,
    ) -> list[dict[str, Any]]:
        """Get all active ad accounts for this integration.

        Args:
            conn: Database connection.

        Returns:
            List of ad account records.
        """
        result = await conn.execute(
            """
            SELECT id, external_id, name, currency, timezone
            FROM ad_accounts
            WHERE integration_id = %s AND status = 'active'
            """,
            (self.integration_id,),
        )
        return await result.fetchall()

    async def update_account_sync_status(
        self,
        conn: psycopg.AsyncConnection,
        account_id: str,
        error: str | None = None,
    ) -> None:
        """Update the last sync timestamp for an account.

        Args:
            conn: Database connection.
            account_id: Account ID (internal UUID).
            error: Optional error message if sync failed.
        """
        if error:
            await conn.execute(
                """
                UPDATE ad_accounts
                SET last_sync_at = NOW(), last_sync_error = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (error, account_id),
            )
        else:
            await conn.execute(
                """
                UPDATE ad_accounts
                SET last_sync_at = NOW(), last_sync_error = NULL, updated_at = NOW()
                WHERE id = %s
                """,
                (account_id,),
            )
