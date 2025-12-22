"""Database connection module."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import psycopg
from psycopg.rows import dict_row

from app.config import settings


async def get_connection() -> psycopg.AsyncConnection:
    """Get a new database connection."""
    return await psycopg.AsyncConnection.connect(
        settings.database_url,
        row_factory=dict_row,
    )


@asynccontextmanager
async def get_db() -> AsyncGenerator[psycopg.AsyncConnection, None]:
    """Context manager for database connections."""
    conn = await get_connection()
    try:
        yield conn
    finally:
        await conn.close()


async def set_workspace_context(conn: psycopg.AsyncConnection, workspace_id: str) -> None:
    """Set the workspace context for RLS."""
    await conn.execute(
        "SELECT set_config('app.workspace_id', %s, true)",
        (workspace_id,),
    )
