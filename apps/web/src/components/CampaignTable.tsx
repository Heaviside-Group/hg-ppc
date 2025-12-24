'use client'

import { useState } from 'react'

export interface CampaignData {
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

interface CampaignTableProps {
  campaigns: CampaignData[]
  loading?: boolean
  onCampaignClick?: (campaign: CampaignData) => void
}

type SortField = 'name' | 'spend' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'cpc' | 'cpa'
type SortOrder = 'asc' | 'desc'

export function CampaignTable({
  campaigns,
  loading = false,
  onCampaignClick,
}: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aVal: number | string
    let bVal: number | string

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
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
      case 'spend':
      default:
        aVal = a.metrics.spend
        bVal = b.metrics.spend
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val)

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US').format(val)

  const formatPercent = (val: number) => `${val.toFixed(2)}%`

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      enabled: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      removed: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          styles[status] || styles.unknown
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getProviderIcon = (provider: string) => {
    if (provider === 'google_ads') {
      return (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600">
          G
        </span>
      )
    }
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-600">
        M
      </span>
    )
  }

  const SortableHeader = ({
    field,
    children,
    align = 'left',
  }: {
    field: SortField
    children: React.ReactNode
    align?: 'left' | 'right'
  }) => (
    <th
      className={`cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-900 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => handleSort(field)}
    >
      <div
        className={`flex items-center gap-1 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        {children}
        {sortField === field && (
          <svg
            className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        )}
      </div>
    </th>
  )

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <div className="animate-pulse p-4">
          <div className="mb-4 h-8 w-48 rounded bg-gray-200" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-3 h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns found</h3>
        <p className="mt-2 text-gray-500">
          Connect an ad account and sync data to see campaigns here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader field="name">Campaign</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <SortableHeader field="impressions" align="right">
                Impressions
              </SortableHeader>
              <SortableHeader field="clicks" align="right">
                Clicks
              </SortableHeader>
              <SortableHeader field="ctr" align="right">
                CTR
              </SortableHeader>
              <SortableHeader field="spend" align="right">
                Spend
              </SortableHeader>
              <SortableHeader field="conversions" align="right">
                Conv.
              </SortableHeader>
              <SortableHeader field="cpc" align="right">
                CPC
              </SortableHeader>
              <SortableHeader field="cpa" align="right">
                CPA
              </SortableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedCampaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className={`${
                  onCampaignClick ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
                onClick={() => onCampaignClick?.(campaign)}
              >
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex items-center gap-2">
                    {getProviderIcon(campaign.provider)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {campaign.adAccountName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {getStatusBadge(campaign.status)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatNumber(campaign.metrics.impressions)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatNumber(campaign.metrics.clicks)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatPercent(campaign.metrics.ctr)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(campaign.metrics.spend)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatNumber(campaign.metrics.conversions)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(campaign.metrics.cpc)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {campaign.metrics.cpa > 0
                    ? formatCurrency(campaign.metrics.cpa)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        Showing {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
