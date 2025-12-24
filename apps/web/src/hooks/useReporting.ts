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
