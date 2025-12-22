/**
 * Database package - Drizzle ORM schema and utilities
 */
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export * from './schema'

export type Database = PostgresJsDatabase<typeof schema>

// Database client singleton
const globalDb = globalThis as unknown as {
  _dbClient?: postgres.Sql
  _db?: Database
}

/**
 * Check if we're in a build phase
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Get the Postgres client
 */
export function getClient() {
  if (isBuildPhase) {
    throw new Error('Database cannot be accessed during build phase')
  }
  if (!globalDb._dbClient) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    globalDb._dbClient = postgres(connectionString)
  }
  return globalDb._dbClient
}

/**
 * Get the Drizzle database instance
 */
export function getDb(): Database {
  if (!globalDb._db) {
    globalDb._db = drizzle(getClient(), { schema })
  }
  return globalDb._db
}

/**
 * Set workspace context for RLS
 * Call this at the start of each request
 */
export async function setWorkspaceContext(workspaceId: string) {
  const client = getClient()
  await client`SELECT set_config('app.workspace_id', ${workspaceId}, true)`
}

// Note: Don't export a pre-initialized db instance
// Always use getDb() to get the database instance at runtime
