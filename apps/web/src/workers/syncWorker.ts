import { Worker, Job } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'
import { SYNC_QUEUE_NAME } from '@/queues/syncQueue'

interface SyncJobData {
  workspaceId: string
  integrationId: string
  type: string
  config?: {
    dateRange?: { start: string; end: string }
    adAccountIds?: string[]
    forceRefresh?: boolean
  }
}

const globalWorkers = globalThis as unknown as {
  _syncWorker?: Worker
}

/**
 * Process sync jobs
 * Note: In Phase 0, this is a placeholder. The actual sync logic
 * will be implemented in the Python worker service in Phase 1.
 */
async function processSyncJob(job: Job<SyncJobData>) {
  console.log(`[SyncWorker] Processing job ${job.id}:`, {
    type: job.name,
    workspaceId: job.data.workspaceId,
    integrationId: job.data.integrationId,
  })

  // Placeholder: In production, this would dispatch to the Python worker
  // via the sync_jobs table or a secondary queue

  await job.updateProgress(100)
  return { success: true, message: 'Job queued for Python worker' }
}

// Only create worker if not already created and not in build phase
if (
  !globalWorkers._syncWorker &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.DISABLE_REDIS?.toLowerCase() !== 'true'
) {
  try {
    globalWorkers._syncWorker = new Worker(SYNC_QUEUE_NAME, processSyncJob, {
      connection: getRedisConnection(),
      concurrency: 5,
    })

    globalWorkers._syncWorker.on('completed', (job) => {
      console.log(`[SyncWorker] Job ${job.id} completed`)
    })

    globalWorkers._syncWorker.on('failed', (job, error) => {
      console.error(`[SyncWorker] Job ${job?.id} failed:`, error.message)
    })

    console.log('[SyncWorker] Worker initialized and ready')
  } catch (error) {
    console.error('[SyncWorker] Failed to initialize worker:', error)
  }
}

export const syncWorker = globalWorkers._syncWorker
