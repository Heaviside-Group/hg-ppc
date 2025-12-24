/**
 * Reporting Overview API
 * Returns aggregated KPIs for a workspace within a date range
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import {
  getDb,
  workspaceMemberships,
  perfCampaignDaily,
} from '@hg-ppc/db'
import { and, eq, gte, lte, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface OverviewMetrics {
  impressions: number
  clicks: number
  spend: number // In currency units (not micros)
  conversions: number
  conversionValue: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

interface OverviewResponse {
  current: OverviewMetrics
  previous: OverviewMetrics | null
  changes: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    cpa: number
    roas: number
  } | null
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
    const compareStartDate = searchParams.get('compareStartDate')
    const compareEndDate = searchParams.get('compareEndDate')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Default to last 30 days if no dates provided
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

    // Aggregate metrics for current period
    const currentMetrics = await aggregateMetrics(
      db,
      workspaceId,
      effectiveStartDate,
      effectiveEndDate
    )

    // Calculate comparison metrics if comparison dates provided
    let previousMetrics: OverviewMetrics | null = null
    let changes: OverviewResponse['changes'] = null

    if (compareStartDate && compareEndDate) {
      previousMetrics = await aggregateMetrics(
        db,
        workspaceId,
        compareStartDate,
        compareEndDate
      )

      changes = calculateChanges(currentMetrics, previousMetrics)
    }

    const response: OverviewResponse = {
      current: currentMetrics,
      previous: previousMetrics,
      changes,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch reporting overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reporting data' },
      { status: 500 }
    )
  }
}

async function aggregateMetrics(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<OverviewMetrics> {
  const result = await db
    .select({
      impressions: sql<number>`COALESCE(SUM(${perfCampaignDaily.impressions}), 0)::bigint`,
      clicks: sql<number>`COALESCE(SUM(${perfCampaignDaily.clicks}), 0)::bigint`,
      spendMicros: sql<number>`COALESCE(SUM(${perfCampaignDaily.spendMicros}), 0)::bigint`,
      conversions: sql<number>`COALESCE(SUM(${perfCampaignDaily.conversions}), 0)::real`,
      conversionValue: sql<number>`COALESCE(SUM(${perfCampaignDaily.conversionValue}), 0)::real`,
    })
    .from(perfCampaignDaily)
    .where(
      and(
        eq(perfCampaignDaily.workspaceId, workspaceId),
        gte(perfCampaignDaily.date, startDate),
        lte(perfCampaignDaily.date, endDate)
      )
    )

  const row = result[0] || {
    impressions: 0,
    clicks: 0,
    spendMicros: 0,
    conversions: 0,
    conversionValue: 0,
  }

  const impressions = Number(row.impressions) || 0
  const clicks = Number(row.clicks) || 0
  const spendMicros = Number(row.spendMicros) || 0
  const conversions = Number(row.conversions) || 0
  const conversionValue = Number(row.conversionValue) || 0

  // Convert micros to currency units
  const spend = spendMicros / 1_000_000

  // Calculate derived metrics
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const cpa = conversions > 0 ? spend / conversions : 0
  const roas = spend > 0 ? conversionValue / spend : 0

  return {
    impressions,
    clicks,
    spend,
    conversions,
    conversionValue,
    ctr,
    cpc,
    cpa,
    roas,
  }
}

function calculateChanges(
  current: OverviewMetrics,
  previous: OverviewMetrics
): OverviewResponse['changes'] {
  const percentChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  return {
    impressions: percentChange(current.impressions, previous.impressions),
    clicks: percentChange(current.clicks, previous.clicks),
    spend: percentChange(current.spend, previous.spend),
    conversions: percentChange(current.conversions, previous.conversions),
    ctr: percentChange(current.ctr, previous.ctr),
    cpc: percentChange(current.cpc, previous.cpc),
    cpa: percentChange(current.cpa, previous.cpa),
    roas: percentChange(current.roas, previous.roas),
  }
}
