/**
 * Campaigns API
 * Lists campaigns for a workspace with aggregated metrics
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import {
  getDb,
  workspaceMemberships,
  campaigns,
  perfCampaignDaily,
  adAccounts,
} from '@hg-ppc/db'
import { and, eq, gte, lte, sql, desc, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface CampaignWithMetrics {
  id: string
  name: string
  status: string
  provider: string
  dailyBudget: number | null
  adAccountName: string
  metrics: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    cpa: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!isAuthUser(authResult)) {
      return authResult
    }
    const user = authResult

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const provider = searchParams.get('provider') // 'google_ads' | 'meta' | null (all)
    const status = searchParams.get('status') // 'enabled' | 'paused' | null (all)
    const sortBy = searchParams.get('sortBy') || 'spend'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Default to last 30 days
    const now = new Date()
    const defaultEndDate = now.toISOString().split('T')[0]
    const defaultStartDate = new Date(now.setDate(now.getDate() - 30))
      .toISOString()
      .split('T')[0]

    const effectiveStartDate = startDate || defaultStartDate
    const effectiveEndDate = endDate || defaultEndDate

    const db = getDb()

    // Verify user has access to workspace
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

    // Build query conditions
    const conditions = [eq(campaigns.workspaceId, workspaceId)]

    if (provider) {
      conditions.push(eq(campaigns.provider, provider as 'google_ads' | 'meta'))
    }

    if (status) {
      conditions.push(eq(campaigns.status, status as 'enabled' | 'paused' | 'removed' | 'unknown'))
    }

    // Get campaigns with aggregated metrics
    const campaignsWithMetrics = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        provider: campaigns.provider,
        dailyBudgetMicros: campaigns.dailyBudgetMicros,
        adAccountName: adAccounts.name,
        impressions: sql<number>`COALESCE(SUM(${perfCampaignDaily.impressions}), 0)::bigint`,
        clicks: sql<number>`COALESCE(SUM(${perfCampaignDaily.clicks}), 0)::bigint`,
        spendMicros: sql<number>`COALESCE(SUM(${perfCampaignDaily.spendMicros}), 0)::bigint`,
        conversions: sql<number>`COALESCE(SUM(${perfCampaignDaily.conversions}), 0)::real`,
      })
      .from(campaigns)
      .leftJoin(adAccounts, eq(campaigns.adAccountId, adAccounts.id))
      .leftJoin(
        perfCampaignDaily,
        and(
          eq(perfCampaignDaily.campaignId, campaigns.id),
          gte(perfCampaignDaily.date, effectiveStartDate),
          lte(perfCampaignDaily.date, effectiveEndDate)
        )
      )
      .where(and(...conditions))
      .groupBy(campaigns.id, adAccounts.name)
      .orderBy(
        sortOrder === 'desc'
          ? desc(sql`COALESCE(SUM(${perfCampaignDaily.spendMicros}), 0)`)
          : asc(sql`COALESCE(SUM(${perfCampaignDaily.spendMicros}), 0)`)
      )

    // Transform to response format
    const result: CampaignWithMetrics[] = campaignsWithMetrics.map((c) => {
      const impressions = Number(c.impressions) || 0
      const clicks = Number(c.clicks) || 0
      const spendMicros = Number(c.spendMicros) || 0
      const conversions = Number(c.conversions) || 0
      const spend = spendMicros / 1_000_000

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        provider: c.provider,
        dailyBudget: c.dailyBudgetMicros ? c.dailyBudgetMicros / 1_000_000 : null,
        adAccountName: c.adAccountName || 'Unknown',
        metrics: {
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          cpa: conversions > 0 ? spend / conversions : 0,
        },
      }
    })

    // Sort by the requested field
    if (sortBy !== 'spend') {
      result.sort((a, b) => {
        let aVal: number, bVal: number
        switch (sortBy) {
          case 'name':
            return sortOrder === 'desc'
              ? b.name.localeCompare(a.name)
              : a.name.localeCompare(b.name)
          case 'impressions':
            aVal = a.metrics.impressions
            bVal = b.metrics.impressions
            break
          case 'clicks':
            aVal = a.metrics.clicks
            bVal = b.metrics.clicks
            break
          case 'conversions':
            aVal = a.metrics.conversions
            bVal = b.metrics.conversions
            break
          case 'ctr':
            aVal = a.metrics.ctr
            bVal = b.metrics.ctr
            break
          case 'cpc':
            aVal = a.metrics.cpc
            bVal = b.metrics.cpc
            break
          case 'cpa':
            aVal = a.metrics.cpa
            bVal = b.metrics.cpa
            break
          default:
            aVal = a.metrics.spend
            bVal = b.metrics.spend
        }
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      })
    }

    return NextResponse.json({
      campaigns: result,
      meta: {
        total: result.length,
        dateRange: {
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
