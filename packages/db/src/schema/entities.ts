/**
 * Entities schema - Unified campaign/ad group/ad model
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  bigint,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { workspaces, clients } from './core'
import { adAccounts, providerEnum } from './integrations'

// ============================================================================
// Enums
// ============================================================================

export const entityStatusEnum = pgEnum('entity_status', [
  'enabled',
  'paused',
  'removed',
  'unknown',
])

export const campaignObjectiveEnum = pgEnum('campaign_objective', [
  'conversions',
  'leads',
  'traffic',
  'awareness',
  'engagement',
  'app_installs',
  'video_views',
  'other',
])

// ============================================================================
// Tables
// ============================================================================

/**
 * Campaigns - Unified across Google Ads and Meta
 */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    adAccountId: uuid('ad_account_id')
      .notNull()
      .references(() => adAccounts.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    status: entityStatusEnum('status').default('unknown').notNull(),
    objective: campaignObjectiveEnum('objective'),
    // Budget in micros (1 USD = 1,000,000 micros)
    dailyBudgetMicros: bigint('daily_budget_micros', { mode: 'number' }),
    lifetimeBudgetMicros: bigint('lifetime_budget_micros', { mode: 'number' }),
    // Raw API response for reference
    rawJson: jsonb('raw_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Platform dates
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
  },
  (table) => [
    index('campaigns_workspace_provider_idx').on(
      table.workspaceId,
      table.provider
    ),
    index('campaigns_ad_account_idx').on(table.adAccountId),
    index('campaigns_external_id_idx').on(table.externalId),
  ]
)

/**
 * Ad Groups - Unified (Google: ad group, Meta: ad set)
 */
export const adGroups = pgTable(
  'ad_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    status: entityStatusEnum('status').default('unknown').notNull(),
    // Targeting and bidding info
    bidStrategyType: text('bid_strategy_type'),
    targetCpaMicros: bigint('target_cpa_micros', { mode: 'number' }),
    targetRoas: text('target_roas'), // Stored as string for precision
    rawJson: jsonb('raw_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ad_groups_workspace_provider_idx').on(
      table.workspaceId,
      table.provider
    ),
    index('ad_groups_campaign_idx').on(table.campaignId),
    index('ad_groups_external_id_idx').on(table.externalId),
  ]
)

/**
 * Ads - Individual advertisements
 */
export const ads = pgTable(
  'ads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    status: entityStatusEnum('status').default('unknown').notNull(),
    // Creative information
    adType: text('ad_type'), // RSA, image, video, etc.
    creativeJson: jsonb('creative_json').$type<{
      headlines?: string[]
      descriptions?: string[]
      imageUrls?: string[]
      videoUrl?: string
      finalUrl?: string
      displayUrl?: string
    }>(),
    rawJson: jsonb('raw_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ads_workspace_provider_idx').on(table.workspaceId, table.provider),
    index('ads_ad_group_idx').on(table.adGroupId),
    index('ads_external_id_idx').on(table.externalId),
  ]
)

// ============================================================================
// Relations
// ============================================================================

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [campaigns.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [campaigns.clientId],
    references: [clients.id],
  }),
  adAccount: one(adAccounts, {
    fields: [campaigns.adAccountId],
    references: [adAccounts.id],
  }),
  adGroups: many(adGroups),
}))

export const adGroupsRelations = relations(adGroups, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [adGroups.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [adGroups.clientId],
    references: [clients.id],
  }),
  campaign: one(campaigns, {
    fields: [adGroups.campaignId],
    references: [campaigns.id],
  }),
  ads: many(ads),
}))

export const adsRelations = relations(ads, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [ads.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [ads.clientId],
    references: [clients.id],
  }),
  adGroup: one(adGroups, {
    fields: [ads.adGroupId],
    references: [adGroups.id],
  }),
}))

// ============================================================================
// Types
// ============================================================================

export type Campaign = typeof campaigns.$inferSelect
export type CampaignInsert = typeof campaigns.$inferInsert

export type AdGroup = typeof adGroups.$inferSelect
export type AdGroupInsert = typeof adGroups.$inferInsert

export type Ad = typeof ads.$inferSelect
export type AdInsert = typeof ads.$inferInsert
