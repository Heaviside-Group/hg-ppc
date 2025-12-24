/**
 * Campaign Detail API
 * GET - Get campaign details
 * PATCH - Update campaign status or budget
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import {
  getDb,
  workspaceMemberships,
  campaigns,
  adAccounts,
  integrations,
} from '@hg-ppc/db'
import { and, eq } from 'drizzle-orm'
import {
  enqueueStatusChange,
  enqueueBudgetChange,
} from '@/lib/queues/mutationQueue'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ campaignId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (!isAuthUser(authResult)) {
      return authResult
    }
    const user = authResult
    const { campaignId } = await params

    const db = getDb()

    // Get campaign with related data
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
      with: {
        adAccount: true,
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this workspace
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, campaign.workspaceId)
      ),
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        provider: campaign.provider,
        externalId: campaign.externalId,
        dailyBudget: campaign.dailyBudgetMicros
          ? campaign.dailyBudgetMicros / 1_000_000
          : null,
        dailyBudgetMicros: campaign.dailyBudgetMicros,
        objective: campaign.objective,
        adAccountId: campaign.adAccountId,
        adAccountName: campaign.adAccount?.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
    })
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (!isAuthUser(authResult)) {
      return authResult
    }
    const user = authResult
    const { campaignId } = await params

    const body = await request.json()
    const { status, dailyBudget } = body as {
      status?: 'enabled' | 'paused'
      dailyBudget?: number
    }

    if (!status && dailyBudget === undefined) {
      return NextResponse.json(
        { error: 'status or dailyBudget is required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Get campaign with related data
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
      with: {
        adAccount: {
          with: {
            integration: true,
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify user has admin/owner access to this workspace
    const membership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, campaign.workspaceId)
      ),
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to modify campaigns' },
        { status: 403 }
      )
    }

    if (!campaign.adAccount?.integration) {
      return NextResponse.json(
        { error: 'Campaign integration not found' },
        { status: 400 }
      )
    }

    const integrationId = campaign.adAccount.integration.id
    const jobIds: string[] = []

    // Queue status change if provided
    if (status && status !== campaign.status) {
      const jobId = await enqueueStatusChange(
        campaign.workspaceId,
        integrationId,
        campaign.id,
        campaign.externalId,
        campaign.adAccountId,
        campaign.provider,
        status
      )
      jobIds.push(jobId)

      // Optimistically update local DB
      await db
        .update(campaigns)
        .set({ status, updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId))
    }

    // Queue budget change if provided
    if (dailyBudget !== undefined) {
      const dailyBudgetMicros = Math.round(dailyBudget * 1_000_000)

      if (dailyBudgetMicros !== campaign.dailyBudgetMicros) {
        const jobId = await enqueueBudgetChange(
          campaign.workspaceId,
          integrationId,
          campaign.id,
          campaign.externalId,
          campaign.adAccountId,
          campaign.provider,
          dailyBudgetMicros
        )
        jobIds.push(jobId)

        // Optimistically update local DB
        await db
          .update(campaigns)
          .set({ dailyBudgetMicros, updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId))
      }
    }

    // Get updated campaign
    const updatedCampaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    })

    return NextResponse.json({
      success: true,
      jobIds,
      campaign: updatedCampaign
        ? {
            id: updatedCampaign.id,
            name: updatedCampaign.name,
            status: updatedCampaign.status,
            dailyBudget: updatedCampaign.dailyBudgetMicros
              ? updatedCampaign.dailyBudgetMicros / 1_000_000
              : null,
          }
        : null,
    })
  } catch (error) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}
