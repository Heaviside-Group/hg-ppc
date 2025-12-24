/**
 * Core schema - Workspaces, Users, and Memberships
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// Enums
// ============================================================================

export const membershipRoleEnum = pgEnum('membership_role', [
  'owner',
  'admin',
  'analyst',
  'viewer',
])

// ============================================================================
// Tables
// ============================================================================

/**
 * Workspaces - Tenant boundary (e.g., "Paving Marketers")
 */
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  settings: jsonb('settings').$type<{
    timezone?: string
    currency?: string
    defaultDateRange?: number
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * Users - Application users
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    hashedPassword: text('hashed_password'),
    emailVerified: timestamp('email_verified'),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)]
)

/**
 * Workspace Memberships - User-Workspace relationships
 */
export const workspaceMemberships = pgTable(
  'workspace_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').default('viewer').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_memberships_user_workspace_idx').on(
      table.userId,
      table.workspaceId
    ),
  ]
)

/**
 * Clients - Businesses managed within a workspace
 */
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  industry: text('industry'),
  timezone: text('timezone').default('America/New_York'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

// ============================================================================
// Relations
// ============================================================================

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  memberships: many(workspaceMemberships),
  clients: many(clients),
}))

// Note: sessions relation is defined in auth.ts to avoid circular imports
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMemberships),
}))

export const workspaceMembershipsRelations = relations(
  workspaceMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [workspaceMemberships.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [workspaceMemberships.workspaceId],
      references: [workspaces.id],
    }),
  })
)

export const clientsRelations = relations(clients, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
}))

// ============================================================================
// Types
// ============================================================================

export type Workspace = typeof workspaces.$inferSelect
export type WorkspaceInsert = typeof workspaces.$inferInsert

export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect
export type WorkspaceMembershipInsert = typeof workspaceMemberships.$inferInsert

export type Client = typeof clients.$inferSelect
export type ClientInsert = typeof clients.$inferInsert
