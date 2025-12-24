/**
 * Single integration management routes.
 *
 * GET - Get integration details with ad accounts.
 * DELETE - Disconnect integration (set status to 'revoked').
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getDb,
  integrations,
  adAccounts,
  workspaceMemberships,
} from '@hg-ppc/db'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ integrationId: string }>
}

export async function GET(request: Request, context: RouteContext) {
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
      with: {
        adAccounts: true,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
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

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Failed to fetch integration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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

    // Verify user has admin/owner access to this workspace
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

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to disconnect integrations' },
        { status: 403 }
      )
    }

    // Set integration status to revoked (soft delete)
    await db
      .update(integrations)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(integrations.id, integrationId))

    // Disable associated ad accounts
    await db
      .update(adAccounts)
      .set({ status: 'disabled', updatedAt: new Date() })
      .where(eq(adAccounts.integrationId, integrationId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect integration:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    )
  }
}
