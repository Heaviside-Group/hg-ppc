/**
 * BullMQ queue for data sync jobs.
 *
 * Handles syncing campaigns, ad groups, ads, and metrics from
 * Google Ads and Meta Ads APIs.
 */

import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

export const SYNC_QUEUE_NAME = 'ppc-sync'

export type SyncJobType =
  | 'sync_all' // Full sync for an integration
  | 'sync_account' // Sync a specific ad account
  | 'sync_campaigns' // Sync campaigns only
  | 'sync_metrics' // Sync daily metrics

export interface SyncJobData {
  type: SyncJobType
  workspaceId: string
  integrationId: string
  adAccountId?: string
  provider: 'google_ads' | 'meta'
  dateRange?: {
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
  }
}

// Lazy initialization to avoid issues during build
let _syncQueue: Queue<SyncJobData> | null = null

export function getSyncQueue(): Queue<SyncJobData> {
  if (!_syncQueue) {
    _syncQueue = new Queue<SyncJobData>(SYNC_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 500,
        },
      },
    })
  }
  return _syncQueue
}

/**
 * Enqueue a full sync for an integration.
 */
export async function enqueueSyncAll(
  workspaceId: string,
  integrationId: string,
  provider: 'google_ads' | 'meta'
): Promise<string> {
  const queue = getSyncQueue()
  const job = await queue.add(
    'sync_all',
    {
      type: 'sync_all',
      workspaceId,
      integrationId,
      provider,
    },
    {
      jobId: `sync_all_${integrationId}_${Date.now()}`,
    }
  )
  return job.id!
}

/**
 * Enqueue a sync for a specific ad account.
 */
export async function enqueueSyncAccount(
  workspaceId: string,
  integrationId: string,
  adAccountId: string,
  provider: 'google_ads' | 'meta'
): Promise<string> {
  const queue = getSyncQueue()
  const job = await queue.add(
    'sync_account',
    {
      type: 'sync_account',
      workspaceId,
      integrationId,
      adAccountId,
      provider,
    },
    {
      jobId: `sync_account_${adAccountId}_${Date.now()}`,
    }
  )
  return job.id!
}

/**
 * Enqueue a metrics sync for a date range.
 */
export async function enqueueSyncMetrics(
  workspaceId: string,
  integrationId: string,
  provider: 'google_ads' | 'meta',
  startDate: string,
  endDate: string
): Promise<string> {
  const queue = getSyncQueue()
  const job = await queue.add(
    'sync_metrics',
    {
      type: 'sync_metrics',
      workspaceId,
      integrationId,
      provider,
      dateRange: { startDate, endDate },
    },
    {
      jobId: `sync_metrics_${integrationId}_${startDate}_${endDate}`,
    }
  )
  return job.id!
}
