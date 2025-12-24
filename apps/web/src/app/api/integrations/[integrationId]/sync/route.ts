/**
 * Manual sync trigger route.
 *
 * POST - Trigger a manual sync for an integration.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb, integrations, workspaceMemberships } from '@hg-ppc/db'
import { eq, and } from 'drizzle-orm'
import { enqueueSyncAll } from '@/lib/queues/syncQueue'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ integrationId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await context.params
    const db = getDb()

    // Get integration with workspace check
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, integrationId),
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Verify integration is active
    if (integration.status !== 'active') {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      )
    }

    // Verify user has access to this workspace
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, session.user.id),
        eq(workspaceMemberships.workspaceId, integration.workspaceId)
      ),
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Enqueue sync job
    const jobId = await enqueueSyncAll(
      integration.workspaceId,
      integration.id,
      integration.provider
    )

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Sync job queued successfully',
    })
  } catch (error) {
    console.error('Failed to trigger sync:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    )
  }
}
