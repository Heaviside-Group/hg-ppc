'use client'

import { useWorkspace } from '@/contexts/WorkspaceContext'

export default function DashboardPage() {
  const { workspace, loading } = useWorkspace()

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {workspace.name} Overview
        </h1>
        <p className="mt-1 text-gray-600">
          Monitor your advertising performance across all connected accounts.
        </p>
      </div>

      {/* KPI Cards - Placeholder */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Spend', value: '$0.00', change: '+0%' },
          { label: 'Conversions', value: '0', change: '+0%' },
          { label: 'CPA', value: '$0.00', change: '0%' },
          { label: 'ROAS', value: '0.00x', change: '0%' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
          >
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {kpi.value}
            </p>
            <p className="mt-1 text-sm text-gray-600">{kpi.change} from last period</p>
          </div>
        ))}
      </div>

      {/* Connect Accounts CTA */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900">
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
    </div>
  )
}
