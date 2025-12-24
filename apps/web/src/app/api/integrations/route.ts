/**
 * Integration management routes.
 *
 * GET - List all integrations for the current workspace with ad account counts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import { getDb, integrations, adAccounts, workspaceMemberships } from '@hg-ppc/db'
import { eq, and, count } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!isAuthUser(authResult)) {
      return authResult
    }
    const user = authResult

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify user has access to this workspace
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Get integrations with ad account counts
    const workspaceIntegrations = await db
      .select({
        id: integrations.id,
        provider: integrations.provider,
        status: integrations.status,
        managerAccountId: integrations.managerAccountId,
        businessId: integrations.businessId,
        createdAt: integrations.createdAt,
        updatedAt: integrations.updatedAt,
        accountCount: count(adAccounts.id),
      })
      .from(integrations)
      .leftJoin(adAccounts, eq(adAccounts.integrationId, integrations.id))
      .where(eq(integrations.workspaceId, workspaceId))
      .groupBy(integrations.id)

    return NextResponse.json({ integrations: workspaceIntegrations })
  } catch (error) {
    console.error('Failed to fetch integrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}
