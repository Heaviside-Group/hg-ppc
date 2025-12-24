'use client'

import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useInsights } from '@/hooks/useReporting'
import { InsightsPanel } from '@/components/InsightsPanel'

export default function InsightsPage() {
  const { workspace, loading: workspaceLoading } = useWorkspace()
  const { data, loading, error, refetch } = useInsights({
    workspaceId: workspace?.id || null,
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
          Select a workspace to view AI insights.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="mt-1 text-gray-600">
            Machine learning-powered analysis of your campaign performance.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {/* Last Updated */}
      {data && (
        <p className="text-sm text-gray-500">
          Last analyzed: {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}

      {/* Insights Panel */}
      <InsightsPanel insights={data} loading={loading} error={error} />

      {/* Empty State */}
      {!loading && !error && !data && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No Data Available
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your ad accounts and sync data to see AI-powered insights.
          </p>
        </div>
      )}
    </div>
  )
}
