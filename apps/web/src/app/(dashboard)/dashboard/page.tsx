'use client'

import { useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { DateRangePicker, defaultDateRange, type DateRange } from '@/components/DateRangePicker'
import { KPICard, KPIGrid } from '@/components/KPICard'
import { CampaignTable } from '@/components/CampaignTable'
import { useOverview, useCampaigns } from '@/hooks/useReporting'

export default function DashboardPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace()
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const { data: overview, loading: overviewLoading } = useOverview({
    workspaceId: workspace?.id || null,
    dateRange,
    compareRange,
  })

  const { data: campaignsData, loading: campaignsLoading } = useCampaigns({
    workspaceId: workspace?.id || null,
    dateRange,
  })

  if (workspaceLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="text-xl font-semibold text-gray-900">No Workspace Selected</h2>
        <p className="mt-2 text-gray-600">
          Create a workspace to get started with managing your ad accounts.
        </p>
        <a
          href="/dashboard/settings"
          className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        >
          Create Workspace
        </a>
      </div>
    )
  }

  const hasData = overview && (
    overview.current.impressions > 0 ||
    overview.current.clicks > 0 ||
    overview.current.spend > 0
  )

  const hasCampaigns = campaignsData && campaignsData.campaigns.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workspace.name} Overview
          </h1>
          <p className="mt-1 text-gray-600">
            Monitor your advertising performance across all connected accounts.
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          compareValue={compareRange}
          onCompareChange={setCompareRange}
          showComparison={true}
        />
      </div>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          label="Total Spend"
          value={overview?.current.spend || 0}
          change={overview?.changes?.spend}
          format="currency"
          loading={overviewLoading}
        />
        <KPICard
          label="Conversions"
          value={overview?.current.conversions || 0}
          change={overview?.changes?.conversions}
          format="number"
          loading={overviewLoading}
        />
        <KPICard
          label="Cost per Acquisition"
          value={overview?.current.cpa || 0}
          change={overview?.changes?.cpa}
          format="currency"
          loading={overviewLoading}
          invertChange={true}
        />
        <KPICard
          label="ROAS"
          value={overview?.current.roas || 0}
          change={overview?.changes?.roas}
          format="multiplier"
          loading={overviewLoading}
        />
      </KPIGrid>

      {/* Secondary KPIs */}
      <KPIGrid>
        <KPICard
          label="Impressions"
          value={overview?.current.impressions || 0}
          change={overview?.changes?.impressions}
          format="number"
          loading={overviewLoading}
        />
        <KPICard
          label="Clicks"
          value={overview?.current.clicks || 0}
          change={overview?.changes?.clicks}
          format="number"
          loading={overviewLoading}
        />
        <KPICard
          label="Click-through Rate"
          value={overview?.current.ctr || 0}
          change={overview?.changes?.ctr}
          format="percent"
          loading={overviewLoading}
        />
        <KPICard
          label="Cost per Click"
          value={overview?.current.cpc || 0}
          change={overview?.changes?.cpc}
          format="currency"
          loading={overviewLoading}
          invertChange={true}
        />
      </KPIGrid>

      {/* Campaigns Table */}
      {hasCampaigns ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
            <a
              href="/dashboard/campaigns"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all campaigns
            </a>
          </div>
          <CampaignTable
            campaigns={campaignsData.campaigns.slice(0, 10)}
            loading={campaignsLoading}
          />
        </div>
      ) : !hasData && !overviewLoading && !campaignsLoading ? (
        /* Connect Accounts CTA - only show when there's no data */
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Connect Your Ad Accounts
          </h3>
          <p className="mt-2 text-gray-600">
            Connect your Google Ads and Meta Ads accounts to start syncing data.
          </p>
          <a
            href="/dashboard/settings/integrations"
            className="mt-4 inline-block rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          >
            Connect Accounts
          </a>
        </div>
      ) : null}
    </div>
  )
}
