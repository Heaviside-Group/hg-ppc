/**
 * Insights API
 * Returns AI-powered insights including anomalies, budget recommendations,
 * forecasts, and pacing status for a workspace.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthUser } from '@/lib/auth/api'
import {
  getDb,
  workspaceMemberships,
  campaigns,
  perfCampaignDaily,
} from '@hg-ppc/db'
import { and, eq, gte, lte, sql, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface DailyMetric {
  campaignId: string
  campaignName: string
  provider: string
  date: string
  impressions: number
  clicks: number
  spendMicros: number
  conversions: number
  conversionValue: number
}

interface Anomaly {
  campaignId: string
  campaignName: string
  provider: string
  metric: string
  currentValue: number
  expectedValue: number
  deviationPct: number
  severity: 'warning' | 'critical'
  direction: 'increase' | 'decrease'
  message: string
}

interface BudgetRecommendation {
  campaignId: string
  campaignName: string
  provider: string
  currentBudget: number
  recommendedBudget: number
  changePct: number
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface Forecast {
  metric: string
  metricName: string
  currentPeriodActual: number
  currentPeriodProjected: number
  nextPeriodForecast: number
  trend: 'up' | 'down' | 'stable'
  trendPct: number
  confidence: 'high' | 'medium' | 'low'
}

interface PacingStatus {
  campaignId: string
  campaignName: string
  provider: string
  periodBudget: number
  spentToDate: number
  pacingStatus: 'on_track' | 'underspending' | 'overspending'
  projectedSpend: number
  projectedVariance: number
  recommendation: string
}

interface InsightsResponse {
  generatedAt: string
  healthScore: number
  keyInsights: string[]
  anomalies: {
    total: number
    critical: number
    warning: number
    items: Anomaly[]
  }
  budgetRecommendations: BudgetRecommendation[]
  forecasts: Forecast[]
  pacing: PacingStatus[]
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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

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

    // Fetch campaigns
    const campaignList = await db.query.campaigns.findMany({
      where: eq(campaigns.workspaceId, workspaceId),
    })

    // Fetch last 60 days of metrics for analysis
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const startDate = sixtyDaysAgo.toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    const metrics = await db
      .select({
        campaignId: perfCampaignDaily.campaignId,
        campaignName: campaigns.name,
        provider: campaigns.provider,
        date: perfCampaignDaily.date,
        impressions: perfCampaignDaily.impressions,
        clicks: perfCampaignDaily.clicks,
        spendMicros: perfCampaignDaily.spendMicros,
        conversions: perfCampaignDaily.conversions,
        conversionValue: perfCampaignDaily.conversionValue,
      })
      .from(perfCampaignDaily)
      .innerJoin(campaigns, eq(campaigns.id, perfCampaignDaily.campaignId))
      .where(
        and(
          eq(perfCampaignDaily.workspaceId, workspaceId),
          gte(perfCampaignDaily.date, startDate),
          lte(perfCampaignDaily.date, endDate)
        )
      )
      .orderBy(desc(perfCampaignDaily.date))

    // Transform metrics
    const dailyMetrics: DailyMetric[] = metrics.map((m) => ({
      campaignId: m.campaignId,
      campaignName: m.campaignName,
      provider: m.provider,
      date: m.date,
      impressions: Number(m.impressions) || 0,
      clicks: Number(m.clicks) || 0,
      spendMicros: Number(m.spendMicros) || 0,
      conversions: Number(m.conversions) || 0,
      conversionValue: Number(m.conversionValue) || 0,
    }))

    // Generate insights
    const anomalies = detectAnomalies(dailyMetrics)
    const budgetRecommendations = generateBudgetRecommendations(
      campaignList,
      dailyMetrics
    )
    const forecasts = generateForecasts(dailyMetrics)
    const pacing = calculatePacing(campaignList, dailyMetrics)

    // Calculate health score
    const healthScore = calculateHealthScore(
      anomalies,
      budgetRecommendations,
      pacing
    )

    // Generate key insights
    const keyInsights = generateKeyInsights(
      anomalies,
      budgetRecommendations,
      forecasts,
      pacing
    )

    const response: InsightsResponse = {
      generatedAt: new Date().toISOString(),
      healthScore,
      keyInsights,
      anomalies: {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === 'critical').length,
        warning: anomalies.filter((a) => a.severity === 'warning').length,
        items: anomalies.slice(0, 10), // Top 10
      },
      budgetRecommendations: budgetRecommendations.slice(0, 10),
      forecasts,
      pacing: pacing.slice(0, 10),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to generate insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

// Analytics helper functions

function detectAnomalies(metrics: DailyMetric[]): Anomaly[] {
  if (metrics.length < 7) return []

  const anomalies: Anomaly[] = []
  const today = new Date().toISOString().split('T')[0]
  const lookbackDays = 30

  // Group by campaign
  const byCampaign = new Map<string, DailyMetric[]>()
  for (const m of metrics) {
    if (!byCampaign.has(m.campaignId)) {
      byCampaign.set(m.campaignId, [])
    }
    byCampaign.get(m.campaignId)!.push(m)
  }

  const metricsToCheck = ['ctr', 'cpc', 'cpa', 'spend'] as const

  for (const [campaignId, campaignMetrics] of byCampaign) {
    if (campaignMetrics.length < 7) continue

    // Sort by date
    campaignMetrics.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const campaignName = campaignMetrics[0].campaignName
    const provider = campaignMetrics[0].provider

    // Calculate derived metrics
    const enriched = campaignMetrics.map((m) => {
      const spend = m.spendMicros / 1_000_000
      return {
        ...m,
        spend,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
        cpc: m.clicks > 0 ? spend / m.clicks : 0,
        cpa: m.conversions > 0 ? spend / m.conversions : 0,
      }
    })

    // Get most recent and historical
    const recent = enriched[enriched.length - 1]
    const historical = enriched.slice(0, -1).slice(-lookbackDays)

    if (historical.length < 7) continue

    for (const metric of metricsToCheck) {
      const values = historical.map((h) => h[metric]).filter((v) => v > 0)
      if (values.length < 5) continue

      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      const std = Math.sqrt(variance)

      if (std === 0) continue

      const currentValue = recent[metric]
      const zScore = (currentValue - mean) / std

      if (Math.abs(zScore) >= 2) {
        const deviationPct = mean > 0 ? ((currentValue - mean) / mean) * 100 : 0
        const severity = Math.abs(zScore) >= 3 ? 'critical' : 'warning'
        const direction = zScore > 0 ? 'increase' : 'decrease'

        const metricNames: Record<string, string> = {
          ctr: 'CTR',
          cpc: 'CPC',
          cpa: 'CPA',
          spend: 'Spend',
        }

        anomalies.push({
          campaignId,
          campaignName,
          provider,
          metric,
          currentValue,
          expectedValue: mean,
          deviationPct,
          severity,
          direction,
          message: `${campaignName}: ${metricNames[metric]} ${direction}d by ${Math.abs(deviationPct).toFixed(1)}%`,
        })
      }
    }
  }

  // Sort by severity
  return anomalies.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (a.severity !== 'critical' && b.severity === 'critical') return 1
    return Math.abs(b.deviationPct) - Math.abs(a.deviationPct)
  })
}

function generateBudgetRecommendations(
  campaignList: typeof campaigns.$inferSelect[],
  metrics: DailyMetric[]
): BudgetRecommendation[] {
  if (metrics.length < 7) return []

  const recommendations: BudgetRecommendation[] = []

  // Aggregate metrics by campaign
  const byCampaign = new Map<
    string,
    { spend: number; conversions: number; conversionValue: number }
  >()

  for (const m of metrics) {
    if (!byCampaign.has(m.campaignId)) {
      byCampaign.set(m.campaignId, { spend: 0, conversions: 0, conversionValue: 0 })
    }
    const agg = byCampaign.get(m.campaignId)!
    agg.spend += m.spendMicros / 1_000_000
    agg.conversions += m.conversions
    agg.conversionValue += m.conversionValue
  }

  // Calculate efficiency for each campaign
  const efficiencies: {
    campaign: typeof campaigns.$inferSelect
    efficiency: number
    roas: number
    cpa: number
  }[] = []

  for (const campaign of campaignList) {
    const agg = byCampaign.get(campaign.id)
    if (!agg || agg.spend < 10) continue

    const roas = agg.spend > 0 ? agg.conversionValue / agg.spend : 0
    const cpa =
      agg.conversions > 0 ? agg.spend / agg.conversions : Number.MAX_VALUE

    // Efficiency score (higher is better)
    const efficiency = roas * 10 - (cpa > 0 ? 1 / cpa : 0)

    efficiencies.push({ campaign, efficiency, roas, cpa })
  }

  if (efficiencies.length < 2) return []

  // Calculate average efficiency
  const avgEfficiency =
    efficiencies.reduce((sum, e) => sum + e.efficiency, 0) / efficiencies.length

  for (const { campaign, efficiency, roas, cpa } of efficiencies) {
    const currentBudget = (campaign.dailyBudgetMicros || 0) / 1_000_000
    if (currentBudget === 0) continue

    const efficiencyDelta = efficiency - avgEfficiency
    const changePct = Math.max(-30, Math.min(30, efficiencyDelta * 10))

    if (Math.abs(changePct) < 5) continue

    const recommendedBudget = currentBudget * (1 + changePct / 100)
    const priority =
      Math.abs(changePct) >= 20
        ? 'high'
        : Math.abs(changePct) >= 10
          ? 'medium'
          : 'low'

    let reason: string
    if (changePct > 0) {
      reason =
        roas > 2
          ? `High ROAS (${roas.toFixed(1)}x)`
          : `Low CPA ($${cpa.toFixed(2)})`
    } else {
      reason =
        roas < 1
          ? `Low ROAS (${roas.toFixed(1)}x)`
          : `High CPA ($${cpa.toFixed(2)})`
    }

    recommendations.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      provider: campaign.provider,
      currentBudget,
      recommendedBudget,
      changePct,
      reason,
      priority,
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return (
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      Math.abs(b.changePct) - Math.abs(a.changePct)
    )
  })
}

function generateForecasts(metrics: DailyMetric[]): Forecast[] {
  if (metrics.length < 7) return []

  // Aggregate by date
  const byDate = new Map<
    string,
    { spend: number; conversions: number; clicks: number; impressions: number }
  >()

  for (const m of metrics) {
    if (!byDate.has(m.date)) {
      byDate.set(m.date, { spend: 0, conversions: 0, clicks: 0, impressions: 0 })
    }
    const agg = byDate.get(m.date)!
    agg.spend += m.spendMicros / 1_000_000
    agg.conversions += m.conversions
    agg.clicks += m.clicks
    agg.impressions += m.impressions
  }

  const dates = Array.from(byDate.keys()).sort()
  const forecasts: Forecast[] = []

  const metricsToForecast = [
    { key: 'spend', name: 'Spend' },
    { key: 'conversions', name: 'Conversions' },
    { key: 'clicks', name: 'Clicks' },
  ] as const

  for (const { key, name } of metricsToForecast) {
    const values = dates.map((d) => byDate.get(d)![key])

    // Simple linear regression
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += (i - xMean) ** 2
    }

    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean

    // Calculate R²
    const predictions = values.map((_, i) => intercept + slope * i)
    const ssRes = values.reduce(
      (sum, v, i) => sum + (v - predictions[i]) ** 2,
      0
    )
    const ssTot = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0)
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0

    // Current period (this month)
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0]

    const currentPeriodValues = dates
      .filter((d) => d >= startOfMonth)
      .map((d) => byDate.get(d)![key])
    const currentPeriodActual = currentPeriodValues.reduce((a, b) => a + b, 0)

    // Project current month
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate()
    const daysElapsed = today.getDate()
    const dailyAvg =
      currentPeriodValues.length > 0
        ? currentPeriodActual / currentPeriodValues.length
        : yMean

    const currentPeriodProjected = dailyAvg * daysInMonth

    // Forecast next 30 days
    const nextPeriodForecast = Array.from({ length: 30 }, (_, i) =>
      Math.max(0, intercept + slope * (n + i))
    ).reduce((a, b) => a + b, 0)

    // Trend
    const trendPct = yMean > 0 ? (slope / yMean) * 100 : 0
    const trend = trendPct > 5 ? 'up' : trendPct < -5 ? 'down' : 'stable'
    const confidence =
      rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low'

    forecasts.push({
      metric: key,
      metricName: name,
      currentPeriodActual,
      currentPeriodProjected,
      nextPeriodForecast,
      trend,
      trendPct,
      confidence,
    })
  }

  return forecasts
}

function calculatePacing(
  campaignList: typeof campaigns.$inferSelect[],
  metrics: DailyMetric[]
): PacingStatus[] {
  const pacing: PacingStatus[] = []
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  // Aggregate spend by campaign for current month
  const startDate = startOfMonth.toISOString().split('T')[0]
  const byCampaign = new Map<string, number>()

  for (const m of metrics) {
    if (m.date >= startDate) {
      byCampaign.set(
        m.campaignId,
        (byCampaign.get(m.campaignId) || 0) + m.spendMicros / 1_000_000
      )
    }
  }

  for (const campaign of campaignList) {
    const dailyBudget = (campaign.dailyBudgetMicros || 0) / 1_000_000
    if (dailyBudget === 0) continue

    const periodBudget = dailyBudget * daysInMonth
    const spentToDate = byCampaign.get(campaign.id) || 0
    const expectedSpend = (daysElapsed / daysInMonth) * periodBudget

    let pacingStatus: PacingStatus['pacingStatus']
    if (expectedSpend > 0) {
      const ratio = spentToDate / expectedSpend
      if (ratio > 1.1) pacingStatus = 'overspending'
      else if (ratio < 0.9) pacingStatus = 'underspending'
      else pacingStatus = 'on_track'
    } else {
      pacingStatus = 'on_track'
    }

    const dailyAvg = daysElapsed > 0 ? spentToDate / daysElapsed : 0
    const projectedSpend = spentToDate + dailyAvg * daysRemaining
    const projectedVariance = projectedSpend - periodBudget

    let recommendation: string
    if (pacingStatus === 'on_track') {
      recommendation = 'Budget pacing is healthy'
    } else if (pacingStatus === 'overspending') {
      recommendation = `Reduce daily spend by $${(Math.abs(projectedVariance) / daysRemaining).toFixed(2)} to stay on budget`
    } else {
      recommendation = `Opportunity to increase spend by $${(Math.abs(projectedVariance) / daysRemaining).toFixed(2)}/day`
    }

    pacing.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      provider: campaign.provider,
      periodBudget,
      spentToDate,
      pacingStatus,
      projectedSpend,
      projectedVariance,
      recommendation,
    })
  }

  return pacing.sort((a, b) => Math.abs(b.projectedVariance) - Math.abs(a.projectedVariance))
}

function calculateHealthScore(
  anomalies: Anomaly[],
  recommendations: BudgetRecommendation[],
  pacing: PacingStatus[]
): number {
  let score = 100

  // Deduct for anomalies
  const critical = anomalies.filter((a) => a.severity === 'critical').length
  const warning = anomalies.filter((a) => a.severity === 'warning').length
  score -= critical * 10
  score -= warning * 3

  // Deduct for high-priority budget issues
  const highPriority = recommendations.filter((r) => r.priority === 'high').length
  score -= highPriority * 5

  // Deduct for pacing issues
  const pacingIssues = pacing.filter((p) => p.pacingStatus !== 'on_track').length
  score -= pacingIssues * 5

  return Math.max(0, Math.min(100, score))
}

function generateKeyInsights(
  anomalies: Anomaly[],
  recommendations: BudgetRecommendation[],
  forecasts: Forecast[],
  pacing: PacingStatus[]
): string[] {
  const insights: string[] = []

  // Anomaly insights
  const critical = anomalies.filter((a) => a.severity === 'critical')
  if (critical.length > 0) {
    insights.push(`${critical.length} critical performance anomalies detected`)
    insights.push(`  → ${critical[0].message}`)
  }

  // Budget insights
  const increases = recommendations.filter((r) => r.changePct > 0)
  const decreases = recommendations.filter((r) => r.changePct < 0)

  if (increases.length > 0) {
    const totalIncrease = increases.reduce(
      (sum, r) => sum + (r.recommendedBudget - r.currentBudget),
      0
    )
    insights.push(
      `Recommended budget increase: $${totalIncrease.toFixed(0)}/day across ${increases.length} campaigns`
    )
  }

  if (decreases.length > 0) {
    const totalDecrease = Math.abs(
      decreases.reduce(
        (sum, r) => sum + (r.recommendedBudget - r.currentBudget),
        0
      )
    )
    insights.push(
      `Recommended budget decrease: $${totalDecrease.toFixed(0)}/day across ${decreases.length} campaigns`
    )
  }

  // Forecast insights
  const spendForecast = forecasts.find((f) => f.metric === 'spend')
  const convForecast = forecasts.find((f) => f.metric === 'conversions')

  if (spendForecast && spendForecast.trend !== 'stable') {
    const direction = spendForecast.trend === 'up' ? 'increasing' : 'decreasing'
    insights.push(
      `Spend is ${direction} ${Math.abs(spendForecast.trendPct).toFixed(1)}% daily`
    )
  }

  if (convForecast) {
    insights.push(
      `Projected ${convForecast.nextPeriodForecast.toFixed(0)} conversions next month (${convForecast.confidence} confidence)`
    )
  }

  // Pacing insights
  const overspending = pacing.filter((p) => p.pacingStatus === 'overspending')
  const underspending = pacing.filter((p) => p.pacingStatus === 'underspending')

  if (overspending.length > 0) {
    const totalOver = overspending.reduce(
      (sum, p) => sum + p.projectedVariance,
      0
    )
    insights.push(
      `${overspending.length} campaigns projected to overspend by $${totalOver.toFixed(0)}`
    )
  }

  if (underspending.length > 0) {
    const totalUnder = Math.abs(
      underspending.reduce((sum, p) => sum + p.projectedVariance, 0)
    )
    insights.push(
      `$${totalUnder.toFixed(0)} unspent budget opportunity across ${underspending.length} campaigns`
    )
  }

  return insights.slice(0, 8)
}
