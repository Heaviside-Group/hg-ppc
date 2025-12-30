import os from 'os'
import { getRedisConnection } from './redis'

const DEFAULT_INTERVAL_MS = 15000
const DEFAULT_TTL_SEC = 90
const HEARTBEAT_PREFIX =
  process.env.WORKER_HEARTBEAT_PREFIX || 'infra:worker:heartbeat'

function resolveIntervalMs() {
  const raw = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS)
  if (Number.isFinite(raw) && raw >= 0) return raw
  return DEFAULT_INTERVAL_MS
}

function resolveTtlSeconds() {
  const raw = Number(process.env.WORKER_HEARTBEAT_TTL_SEC)
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw)
  return DEFAULT_TTL_SEC
}

function resolveWorkerId(explicitId?: string) {
  if (explicitId) return explicitId
  if (process.env.WORKER_HEARTBEAT_ID) return process.env.WORKER_HEARTBEAT_ID
  if (process.env.WORKER_ID) return process.env.WORKER_ID
  return `${os.hostname()}-${process.pid}`
}

export function startWorkerHeartbeat(queueName: string, workerId?: string) {
  const intervalMs = resolveIntervalMs()
  if (intervalMs === 0) {
    return { stop: async () => {} }
  }

  const ttlSeconds = resolveTtlSeconds()
  const resolvedWorkerId = resolveWorkerId(workerId)
  const key = `${HEARTBEAT_PREFIX}:${queueName}:${resolvedWorkerId}`
  const redis = getRedisConnection()
  let active = true

  const buildPayload = () =>
    JSON.stringify({
      ts: Date.now(),
      queue: queueName,
      workerId: resolvedWorkerId,
      host: os.hostname(),
      pid: process.pid,
    })

  const sendHeartbeat = async () => {
    if (!active) return
    try {
      await redis.set(key, buildPayload(), 'EX', ttlSeconds)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[Heartbeat] ${queueName} failed: ${message}`)
    }
  }

  void sendHeartbeat()

  const timer = setInterval(() => {
    void sendHeartbeat()
  }, intervalMs)

  if (typeof timer.unref === 'function') {
    timer.unref()
  }

  return {
    stop: async () => {
      active = false
      clearInterval(timer)
      try {
        await redis.del(key)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[Heartbeat] Failed to clear ${queueName}: ${message}`)
      }
    },
  }
}
