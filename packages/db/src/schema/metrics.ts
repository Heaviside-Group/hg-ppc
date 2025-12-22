/**
 * Metrics schema - Daily performance fact tables
 */
import {
  pgTable,
  uuid,
  date,
  bigint,
  real,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { workspaces, clients } from './core'
import { providerEnum } from './integrations'
import { campaigns, adGroups, ads } from './entities'

// ============================================================================
// Tables
// ============================================================================

/**
 * Campaign Daily Performance
 */
export const perfCampaignDaily = pgTable(
  'perf_campaign_daily',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    date: date('date').notNull(),
    // Core metrics
    impressions: bigint('impressions', { mode: 'number' }).default(0).notNull(),
    clicks: bigint('clicks', { mode: 'number' }).default(0).notNull(),
    spendMicros: bigint('spend_micros', { mode: 'number' }).default(0).notNull(),
    conversions: real('conversions').default(0).notNull(),
    conversionValue: real('conversion_value').default(0).notNull(),
    // Calculated metrics (can be computed but stored for query performance)
    ctr: real('ctr'), // clicks / impressions
    cpc: real('cpc'), // spend / clicks (in currency units)
    cpm: real('cpm'), // spend / impressions * 1000
    cpa: real('cpa'), // spend / conversions
    roas: real('roas'), // conversion_value / spend
    // Provider-specific metrics as JSONB
    providerMetrics: jsonb('provider_metrics').$type<{
      // Google Ads specific
      searchImpressionShare?: number
      searchTopImpressionRate?: number
      absoluteTopImpressionRate?: number
      viewThroughConversions?: number
      // Meta specific
      reach?: number
      frequency?: number
      linkClicks?: number
      outboundClicks?: number
      costPerThruplay?: number
      videoPlays?: number
      videoWatched25?: number
      videoWatched50?: number
      videoWatched75?: number
      videoWatched100?: number
    }>(),
  },
  (table) => [
    primaryKey({ columns: [table.campaignId, table.date] }),
    index('perf_campaign_daily_workspace_date_idx').on(
      table.workspaceId,
      table.date
    ),
    index('perf_campaign_daily_client_date_idx').on(table.clientId, table.date),
  ]
)

/**
 * Ad Group Daily Performance
 */
export const perfAdGroupDaily = pgTable(
  'perf_ad_group_daily',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    adGroupId: uuid('ad_group_id')
      .notNull()
      .references(() => adGroups.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    date: date('date').notNull(),
    // Core metrics
    impressions: bigint('impressions', { mode: 'number' }).default(0).notNull(),
    clicks: bigint('clicks', { mode: 'number' }).default(0).notNull(),
    spendMicros: bigint('spend_micros', { mode: 'number' }).default(0).notNull(),
    conversions: real('conversions').default(0).notNull(),
    conversionValue: real('conversion_value').default(0).notNull(),
    // Calculated metrics
    ctr: real('ctr'),
    cpc: real('cpc'),
    cpm: real('cpm'),
    cpa: real('cpa'),
    roas: real('roas'),
    // Provider-specific metrics
    providerMetrics: jsonb('provider_metrics'),
  },
  (table) => [
    primaryKey({ columns: [table.adGroupId, table.date] }),
    index('perf_ad_group_daily_workspace_date_idx').on(
      table.workspaceId,
      table.date
    ),
    index('perf_ad_group_daily_client_date_idx').on(table.clientId, table.date),
  ]
)

/**
 * Ad Daily Performance
 */
export const perfAdDaily = pgTable(
  'perf_ad_daily',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    adId: uuid('ad_id')
      .notNull()
      .references(() => ads.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    date: date('date').notNull(),
    // Core metrics
    impressions: bigint('impressions', { mode: 'number' }).default(0).notNull(),
    clicks: bigint('clicks', { mode: 'number' }).default(0).notNull(),
    spendMicros: bigint('spend_micros', { mode: 'number' }).default(0).notNull(),
    conversions: real('conversions').default(0).notNull(),
    conversionValue: real('conversion_value').default(0).notNull(),
    // Calculated metrics
    ctr: real('ctr'),
    cpc: real('cpc'),
    cpm: real('cpm'),
    cpa: real('cpa'),
    roas: real('roas'),
    // Provider-specific metrics
    providerMetrics: jsonb('provider_metrics'),
  },
  (table) => [
    primaryKey({ columns: [table.adId, table.date] }),
    index('perf_ad_daily_workspace_date_idx').on(table.workspaceId, table.date),
    index('perf_ad_daily_client_date_idx').on(table.clientId, table.date),
  ]
)

// ============================================================================
// Relations
// ============================================================================

export const perfCampaignDailyRelations = relations(
  perfCampaignDaily,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [perfCampaignDaily.workspaceId],
      references: [workspaces.id],
    }),
    client: one(clients, {
      fields: [perfCampaignDaily.clientId],
      references: [clients.id],
    }),
    campaign: one(campaigns, {
      fields: [perfCampaignDaily.campaignId],
      references: [campaigns.id],
    }),
  })
)

export const perfAdGroupDailyRelations = relations(
  perfAdGroupDaily,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [perfAdGroupDaily.workspaceId],
      references: [workspaces.id],
    }),
    client: one(clients, {
      fields: [perfAdGroupDaily.clientId],
      references: [clients.id],
    }),
    adGroup: one(adGroups, {
      fields: [perfAdGroupDaily.adGroupId],
      references: [adGroups.id],
    }),
  })
)

export const perfAdDailyRelations = relations(perfAdDaily, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [perfAdDaily.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [perfAdDaily.clientId],
    references: [clients.id],
  }),
  ad: one(ads, {
    fields: [perfAdDaily.adId],
    references: [ads.id],
  }),
}))

// ============================================================================
// Types
// ============================================================================

export type PerfCampaignDaily = typeof perfCampaignDaily.$inferSelect
export type PerfCampaignDailyInsert = typeof perfCampaignDaily.$inferInsert

export type PerfAdGroupDaily = typeof perfAdGroupDaily.$inferSelect
export type PerfAdGroupDailyInsert = typeof perfAdGroupDaily.$inferInsert

export type PerfAdDaily = typeof perfAdDaily.$inferSelect
export type PerfAdDailyInsert = typeof perfAdDaily.$inferInsert
