"""Worker heartbeat helper for BullMQ workers."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import time
from dataclasses import dataclass
from typing import Optional

from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL_MS = 15000
DEFAULT_TTL_SEC = 90
HEARTBEAT_PREFIX = os.getenv("WORKER_HEARTBEAT_PREFIX", "infra:worker:heartbeat")

_heartbeat_redis: Optional[Redis] = None


def _get_heartbeat_redis() -> Redis:
    global _heartbeat_redis
    if _heartbeat_redis is None:
        _heartbeat_redis = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
        )
    return _heartbeat_redis


def _resolve_interval_seconds() -> float:
    raw = os.getenv("WORKER_HEARTBEAT_INTERVAL_MS")
    if raw:
        try:
            value = float(raw)
            if value >= 0:
                return value / 1000.0
        except ValueError:
            pass
    return DEFAULT_INTERVAL_MS / 1000.0


def _resolve_ttl_seconds() -> int:
    raw = os.getenv("WORKER_HEARTBEAT_TTL_SEC")
    if raw:
        try:
            value = int(raw)
            if value > 0:
                return value
        except ValueError:
            pass
    return DEFAULT_TTL_SEC


def _resolve_worker_id(explicit_id: Optional[str] = None) -> str:
    if explicit_id:
        return explicit_id
    if os.getenv("WORKER_HEARTBEAT_ID"):
        return os.getenv("WORKER_HEARTBEAT_ID") or ""
    if os.getenv("WORKER_ID"):
        return os.getenv("WORKER_ID") or ""
    return f"{socket.gethostname()}-{os.getpid()}"


async def _heartbeat_loop(
    redis: Redis,
    key: str,
    queue_name: str,
    worker_id: str,
    interval_seconds: float,
    ttl_seconds: int,
) -> None:
    while True:
        try:
            payload = json.dumps(
                {
                    "ts": int(time.time() * 1000),
                    "queue": queue_name,
                    "workerId": worker_id,
                    "host": socket.gethostname(),
                    "pid": os.getpid(),
                }
            )
            await redis.set(key, payload, ex=ttl_seconds)
        except Exception as exc:
            logger.warning(
                "Worker heartbeat failed",
                extra={"queue": queue_name, "error": str(exc)},
            )

        await asyncio.sleep(interval_seconds)


@dataclass
class HeartbeatHandle:
    task: Optional[asyncio.Task]
    key: Optional[str]
    redis: Optional[Redis]

    async def stop(self) -> None:
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None

        if self.redis and self.key:
            try:
                await self.redis.delete(self.key)
            except Exception as exc:
                logger.warning("Failed to clear heartbeat", extra={"error": str(exc)})


def start_worker_heartbeat(queue_name: str, worker_id: Optional[str] = None) -> HeartbeatHandle:
    interval_seconds = _resolve_interval_seconds()
    if interval_seconds == 0:
        return HeartbeatHandle(task=None, key=None, redis=None)

    ttl_seconds = _resolve_ttl_seconds()
    resolved_worker_id = _resolve_worker_id(worker_id)
    key = f"{HEARTBEAT_PREFIX}:{queue_name}:{resolved_worker_id}"
    redis = _get_heartbeat_redis()

    task = asyncio.create_task(
        _heartbeat_loop(
            redis,
            key,
            queue_name,
            resolved_worker_id,
            interval_seconds,
            ttl_seconds,
        )
    )

    return HeartbeatHandle(task=task, key=key, redis=redis)
