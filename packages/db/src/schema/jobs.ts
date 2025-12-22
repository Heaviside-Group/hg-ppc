/**
 * Jobs schema - Sync job tracking and logging
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { workspaces } from './core'
import { integrations } from './integrations'

// ============================================================================
// Enums
// ============================================================================

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])

export const jobTypeEnum = pgEnum('job_type', [
  'sync:google:full',
  'sync:google:daily',
  'sync:meta:full',
  'sync:meta:daily',
  'sync:backfill',
])

export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warn',
  'error',
])

// ============================================================================
// Tables
// ============================================================================

/**
 * Sync Jobs - Track data sync operations
 */
export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    integrationId: uuid('integration_id')
      .notNull()
      .references(() => integrations.id, { onDelete: 'cascade' }),
    type: jobTypeEnum('type').notNull(),
    status: jobStatusEnum('status').default('pending').notNull(),
    // Job configuration
    config: jsonb('config').$type<{
      dateRange?: { start: string; end: string }
      adAccountIds?: string[]
      forceRefresh?: boolean
    }>(),
    // Execution details
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    error: text('error'),
    // Stats
    metadata: jsonb('metadata').$type<{
      campaignsSynced?: number
      adGroupsSynced?: number
      adsSynced?: number
      metricsRowsSynced?: number
      warnings?: string[]
    }>(),
    // BullMQ job reference
    bullmqJobId: text('bullmq_job_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('sync_jobs_workspace_idx').on(table.workspaceId),
    index('sync_jobs_integration_idx').on(table.integrationId),
    index('sync_jobs_status_idx').on(table.status),
    index('sync_jobs_created_at_idx').on(table.createdAt),
  ]
)

/**
 * Sync Logs - Detailed logging for sync operations
 */
export const syncLogs = pgTable(
  'sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => syncJobs.id, { onDelete: 'cascade' }),
    level: logLevelEnum('level').default('info').notNull(),
    message: text('message').notNull(),
    // Additional context
    context: jsonb('context').$type<Record<string, unknown>>(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    index('sync_logs_job_idx').on(table.jobId),
    index('sync_logs_timestamp_idx').on(table.timestamp),
  ]
)

// ============================================================================
// Relations
// ============================================================================

export const syncJobsRelations = relations(syncJobs, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [syncJobs.workspaceId],
    references: [workspaces.id],
  }),
  integration: one(integrations, {
    fields: [syncJobs.integrationId],
    references: [integrations.id],
  }),
  logs: many(syncLogs),
}))

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  job: one(syncJobs, {
    fields: [syncLogs.jobId],
    references: [syncJobs.id],
  }),
}))

// ============================================================================
// Types
// ============================================================================

export type SyncJob = typeof syncJobs.$inferSelect
export type SyncJobInsert = typeof syncJobs.$inferInsert

export type SyncLog = typeof syncLogs.$inferSelect
export type SyncLogInsert = typeof syncLogs.$inferInsert
