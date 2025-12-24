"""HG PPC Worker Service - FastAPI application with BullMQ workers."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import get_db
from app.workers.sync_worker import (
    start_worker as start_sync_worker,
    stop_worker as stop_sync_worker,
)
from app.workers.mutation_worker import (
    start_worker as start_mutation_worker,
    stop_worker as stop_mutation_worker,
)
from app.workers.insights_worker import (
    start_worker as start_insights_worker,
    stop_worker as stop_insights_worker,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    logger.info("Starting HG PPC Worker Service...")

    # Start all BullMQ workers
    sync_task = asyncio.create_task(start_sync_worker())
    mutation_task = asyncio.create_task(start_mutation_worker())
    insights_task = asyncio.create_task(start_insights_worker())

    logger.info("Worker service started successfully (sync + mutation + insights)")

    yield

    # Shutdown
    logger.info("Shutting down worker service...")
    await stop_sync_worker()
    await stop_mutation_worker()
    await stop_insights_worker()

    sync_task.cancel()
    mutation_task.cancel()
    insights_task.cancel()

    for task in [sync_task, mutation_task, insights_task]:
        try:
            await task
        except asyncio.CancelledError:
            pass

    logger.info("Worker service stopped")


app = FastAPI(
    title="HG PPC Worker",
    description="Background worker service for HG PPC platform",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"service": "hg-ppc-worker", "status": "running"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    health_status = {
        "status": "ok",
        "database": False,
        "redis": False,
    }

    # Check database
    try:
        async with get_db() as conn:
            await conn.execute("SELECT 1")
            health_status["database"] = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")

    # Check Redis (via BullMQ)
    try:
        from bullmq import Queue

        queue = Queue("ppc-sync", {"connection": settings.redis_url})
        await queue.getJobCounts()
        await queue.close()
        health_status["redis"] = True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")

    all_healthy = health_status["database"] and health_status["redis"]

    return JSONResponse(
        content=health_status,
        status_code=200 if all_healthy else 503,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
    )
