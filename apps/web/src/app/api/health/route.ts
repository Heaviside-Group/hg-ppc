import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: false,
    redis: false,
  }

  try {
    // Test database connection
    const { getClient } = await import('@hg-ppc/db')
    const client = getClient()
    await client`SELECT 1`
    health.database = true
  } catch (error) {
    console.error('Database health check failed:', error)
  }

  try {
    // Test Redis connection
    const { getRedisConnection } = await import('@/lib/redis')
    const redis = getRedisConnection()
    await redis.ping()
    health.redis = true
  } catch (error) {
    console.error('Redis health check failed:', error)
  }

  const allHealthy = health.database && health.redis
  const status = allHealthy ? 200 : 503

  return NextResponse.json(health, { status })
}
