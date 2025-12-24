/**
 * Google Ads OAuth connect route.
 *
 * Initiates the OAuth flow by redirecting to Google's consent screen.
 * Requires workspaceId query parameter.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import { getDb, workspaceMemberships } from '@hg-ppc/db'
import { and, eq } from 'drizzle-orm'
import { getGoogleAuthUrl } from '@/lib/oauth/google'

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

    // Verify user has access to this workspace (admin or owner)
    const db = getDb()
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

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to connect integrations' },
        { status: 403 }
      )
    }

    // Generate OAuth URL with state parameter
    const authUrl = getGoogleAuthUrl(workspaceId, user.id)

    // Redirect to Google OAuth consent
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Failed to initiate Google OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
