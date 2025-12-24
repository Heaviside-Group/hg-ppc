/**
 * Meta Ads OAuth connect route.
 *
 * Initiates the OAuth flow by redirecting to Meta's consent screen.
 * Requires workspaceId query parameter.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb, workspaceMemberships } from '@hg-ppc/db'
import { and, eq } from 'drizzle-orm'
import { getMetaAuthUrl } from '@/lib/oauth/meta'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this workspace (admin or owner)
    const db = getDb()
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, session.user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to connect integrations' },
        { status: 403 }
      )
    }

    // Generate OAuth URL with state parameter
    const authUrl = getMetaAuthUrl(workspaceId, session.user.id)

    // Redirect to Meta OAuth consent
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Failed to initiate Meta OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
