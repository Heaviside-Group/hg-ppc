import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

export const SYNC_QUEUE_NAME = 'ppc-sync'

const globalQueues = globalThis as unknown as {
  _syncQueue?: Queue
}

const shouldDisableRedis =
  (process.env.DISABLE_REDIS ?? '').toLowerCase() === 'true' ||
  process.env.NEXT_PHASE === 'phase-production-build'

class NoopQueue {
  constructor(private readonly name: string) {}

  async add() {
    return { name: this.name }
  }

  async addBulk() {
    return []
  }

  async pause() {
    return
  }

  async resume() {
    return
  }

  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
  }

  async close() {
    return
  }
}

if (!globalQueues._syncQueue) {
  globalQueues._syncQueue = shouldDisableRedis
    ? (new NoopQueue(SYNC_QUEUE_NAME) as unknown as Queue)
    : new Queue(SYNC_QUEUE_NAME, {
        connection: getRedisConnection(),
      })
}

export const syncQueue = globalQueues._syncQueue

/**
 * Add a sync job to the queue
 */
export async function enqueueSyncJob(data: {
  workspaceId: string
  integrationId: string
  type: 'sync:google:full' | 'sync:google:daily' | 'sync:meta:full' | 'sync:meta:daily'
  config?: {
    dateRange?: { start: string; end: string }
    adAccountIds?: string[]
    forceRefresh?: boolean
  }
}) {
  return syncQueue.add(data.type, data, {
    removeOnComplete: 100,
    removeOnFail: 500,
  })
}
