/**
 * Integrations schema - OAuth connections and ad accounts
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
import { workspaces, clients } from './core'

// ============================================================================
// Enums
// ============================================================================

export const providerEnum = pgEnum('provider', ['google_ads', 'meta'])

export const integrationStatusEnum = pgEnum('integration_status', [
  'active',
  'expired',
  'revoked',
  'error',
])

export const adAccountStatusEnum = pgEnum('ad_account_status', [
  'active',
  'paused',
  'disabled',
  'pending',
])

// ============================================================================
// Tables
// ============================================================================

/**
 * Integrations - OAuth connections per workspace
 */
export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    status: integrationStatusEnum('status').default('active').notNull(),
    // Google Ads: MCC customer ID for hierarchy access
    managerAccountId: text('manager_account_id'),
    // Meta: Business ID
    businessId: text('business_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('integrations_workspace_provider_idx').on(
      table.workspaceId,
      table.provider
    ),
  ]
)

/**
 * Integration Credentials - Encrypted OAuth tokens
 */
export const integrationCredentials = pgTable('integration_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' })
    .unique(),
  // Encrypted token blob (AES-256-GCM)
  encryptedBlob: text('encrypted_blob').notNull(),
  // IV for decryption
  iv: text('iv').notNull(),
  // Auth tag for verification
  authTag: text('auth_tag').notNull(),
  // Token metadata (not encrypted)
  expiresAt: timestamp('expires_at'),
  scopes: jsonb('scopes').$type<string[]>(),
  tokenType: text('token_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * Ad Accounts - Connected advertising accounts
 */
export const adAccounts = pgTable(
  'ad_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    integrationId: uuid('integration_id')
      .notNull()
      .references(() => integrations.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    // External ID (Google: customer_id, Meta: act_xxx)
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    currency: text('currency').default('USD'),
    timezone: text('timezone'),
    status: adAccountStatusEnum('status').default('active').notNull(),
    // Last successful sync
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncError: text('last_sync_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ad_accounts_workspace_provider_idx').on(
      table.workspaceId,
      table.provider
    ),
    index('ad_accounts_external_id_idx').on(table.externalId),
  ]
)

// ============================================================================
// Relations
// ============================================================================

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspaceId],
    references: [workspaces.id],
  }),
  credentials: one(integrationCredentials),
  adAccounts: many(adAccounts),
}))

export const integrationCredentialsRelations = relations(
  integrationCredentials,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [integrationCredentials.integrationId],
      references: [integrations.id],
    }),
  })
)

export const adAccountsRelations = relations(adAccounts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [adAccounts.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [adAccounts.clientId],
    references: [clients.id],
  }),
  integration: one(integrations, {
    fields: [adAccounts.integrationId],
    references: [integrations.id],
  }),
}))

// ============================================================================
// Types
// ============================================================================

export type Integration = typeof integrations.$inferSelect
export type IntegrationInsert = typeof integrations.$inferInsert

export type IntegrationCredential = typeof integrationCredentials.$inferSelect
export type IntegrationCredentialInsert = typeof integrationCredentials.$inferInsert

export type AdAccount = typeof adAccounts.$inferSelect
export type AdAccountInsert = typeof adAccounts.$inferInsert
