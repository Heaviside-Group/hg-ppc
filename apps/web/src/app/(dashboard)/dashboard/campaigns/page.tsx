'use client'

import { useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { DateRangePicker, defaultDateRange, type DateRange } from '@/components/DateRangePicker'
import { CampaignTable, type CampaignData } from '@/components/CampaignTable'
import { CampaignEditModal, type CampaignUpdates } from '@/components/CampaignEditModal'
import { useCampaigns } from '@/hooks/useReporting'

type ProviderFilter = 'all' | 'google_ads' | 'meta'
type StatusFilter = 'all' | 'enabled' | 'paused'

export default function CampaignsPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace()
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null)

  const { data, loading, error, refetch } = useCampaigns({
    workspaceId: workspace?.id || null,
    dateRange,
    provider: providerFilter === 'all' ? undefined : providerFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const handleCampaignClick = (campaign: CampaignData) => {
    setEditingCampaign(campaign)
  }

  const handleSaveCampaign = async (updates: CampaignUpdates) => {
    if (!editingCampaign) return

    const response = await fetch(`/api/campaigns/${editingCampaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update campaign')
    }

    // Refresh the campaign list
    await refetch()
  }

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
          Select a workspace to view campaigns.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-gray-600">
            View and manage all campaigns across your connected ad accounts.
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          showComparison={false}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Provider Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Platform:</span>
          <div className="flex rounded-md shadow-sm">
            {[
              { value: 'all', label: 'All' },
              { value: 'google_ads', label: 'Google' },
              { value: 'meta', label: 'Meta' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setProviderFilter(option.value as ProviderFilter)}
                className={`px-3 py-1.5 text-sm font-medium first:rounded-l-md last:rounded-r-md ${
                  providerFilter === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex rounded-md shadow-sm">
            {[
              { value: 'all', label: 'All' },
              { value: 'enabled', label: 'Active' },
              { value: 'paused', label: 'Paused' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value as StatusFilter)}
                className={`px-3 py-1.5 text-sm font-medium first:rounded-l-md last:rounded-r-md ${
                  statusFilter === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign Count */}
        {data && (
          <div className="ml-auto text-sm text-gray-500">
            {data.meta.total} campaign{data.meta.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading campaigns</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <CampaignTable
        campaigns={data?.campaigns || []}
        loading={loading}
        onCampaignClick={handleCampaignClick}
      />

      {/* Empty State with Filters */}
      {!loading && data?.campaigns.length === 0 && (providerFilter !== 'all' || statusFilter !== 'all') && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            No campaigns match your current filters.{' '}
            <button
              type="button"
              onClick={() => {
                setProviderFilter('all')
                setStatusFilter('all')
              }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Clear filters
            </button>
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <CampaignEditModal
        campaign={editingCampaign}
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSave={handleSaveCampaign}
      />
    </div>
  )
}
