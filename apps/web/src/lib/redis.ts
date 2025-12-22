import IORedis from 'ioredis'

const globalRedis = globalThis as unknown as {
  _redisConnection?: IORedis
}

const shouldDisableRedis =
  (process.env.DISABLE_REDIS ?? '').toLowerCase() === 'true' ||
  process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Get Redis connection singleton
 */
export function getRedisConnection(): IORedis {
  if (shouldDisableRedis) {
    // Return a mock during build or when disabled
    return {
      ping: async () => 'PONG',
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      quit: async () => 'OK',
    } as unknown as IORedis
  }

  if (!globalRedis._redisConnection) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set')
    }
    globalRedis._redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }

  return globalRedis._redisConnection
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (globalRedis._redisConnection) {
    await globalRedis._redisConnection.quit()
    globalRedis._redisConnection = undefined
  }
}
