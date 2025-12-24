/**
 * BullMQ queue for campaign mutation jobs.
 *
 * Handles campaign status changes and budget updates via
 * Google Ads and Meta Ads APIs.
 */

import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

export const MUTATION_QUEUE_NAME = 'ppc-mutation'

export type MutationJobType =
  | 'update_campaign_status' // Pause/enable a campaign
  | 'update_campaign_budget' // Change daily budget

export interface MutationJobData {
  type: MutationJobType
  workspaceId: string
  integrationId: string
  campaignId: string // Our internal campaign ID
  externalCampaignId: string // Platform's campaign ID
  adAccountId: string
  provider: 'google_ads' | 'meta'
  payload: CampaignStatusPayload | CampaignBudgetPayload
}

export interface CampaignStatusPayload {
  status: 'enabled' | 'paused'
}

export interface CampaignBudgetPayload {
  dailyBudgetMicros: number
}

// Lazy initialization to avoid issues during build
let _mutationQueue: Queue<MutationJobData> | null = null

export function getMutationQueue(): Queue<MutationJobData> {
  if (!_mutationQueue) {
    _mutationQueue = new Queue<MutationJobData>(MUTATION_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
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
  return _mutationQueue
}

/**
 * Enqueue a campaign status change (pause/enable).
 */
export async function enqueueStatusChange(
  workspaceId: string,
  integrationId: string,
  campaignId: string,
  externalCampaignId: string,
  adAccountId: string,
  provider: 'google_ads' | 'meta',
  status: 'enabled' | 'paused'
): Promise<string> {
  const queue = getMutationQueue()
  const job = await queue.add(
    'update_campaign_status',
    {
      type: 'update_campaign_status',
      workspaceId,
      integrationId,
      campaignId,
      externalCampaignId,
      adAccountId,
      provider,
      payload: { status },
    },
    {
      jobId: `status_${campaignId}_${Date.now()}`,
    }
  )
  return job.id!
}

/**
 * Enqueue a campaign budget change.
 */
export async function enqueueBudgetChange(
  workspaceId: string,
  integrationId: string,
  campaignId: string,
  externalCampaignId: string,
  adAccountId: string,
  provider: 'google_ads' | 'meta',
  dailyBudgetMicros: number
): Promise<string> {
  const queue = getMutationQueue()
  const job = await queue.add(
    'update_campaign_budget',
    {
      type: 'update_campaign_budget',
      workspaceId,
      integrationId,
      campaignId,
      externalCampaignId,
      adAccountId,
      provider,
      payload: { dailyBudgetMicros },
    },
    {
      jobId: `budget_${campaignId}_${Date.now()}`,
    }
  )
  return job.id!
}
