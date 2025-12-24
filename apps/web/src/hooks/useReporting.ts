'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DateRange } from '@/components/DateRangePicker'
import type { CampaignData } from '@/components/CampaignTable'

interface OverviewMetrics {
  impressions: number
  clicks: number
  spend: number
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

interface CampaignsResponse {
  campaigns: CampaignData[]
  meta: {
    total: number
    dateRange: {
      startDate: string
      endDate: string
    }
  }
}

interface UseOverviewOptions {
  workspaceId: string | null
  dateRange: DateRange
  compareRange: DateRange | null
}

export function useOverview({ workspaceId, dateRange, compareRange }: UseOverviewOptions) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        workspaceId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })

      if (compareRange) {
        params.append('compareStartDate', compareRange.startDate)
        params.append('compareEndDate', compareRange.endDate)
      }

      const response = await fetch(`/api/reporting/overview?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch overview data')
      }

      const result: OverviewResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, dateRange, compareRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

interface UseCampaignsOptions {
  workspaceId: string | null
  dateRange: DateRange
  provider?: string
  status?: string
}

export function useCampaigns({
  workspaceId,
  dateRange,
  provider,
  status,
}: UseCampaignsOptions) {
  const [data, setData] = useState<CampaignsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        workspaceId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })

      if (provider) params.append('provider', provider)
      if (status) params.append('status', status)

      const response = await fetch(`/api/campaigns?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const result: CampaignsResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, dateRange, provider, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Insights types
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

export interface InsightsResponse {
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

interface UseInsightsOptions {
  workspaceId: string | null
}

export function useInsights({ workspaceId }: UseInsightsOptions) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ workspaceId })
      const response = await fetch(`/api/insights?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const result: InsightsResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
