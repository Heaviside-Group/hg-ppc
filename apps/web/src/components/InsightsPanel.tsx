'use client'

import type { InsightsResponse } from '@/hooks/useReporting'

interface InsightsPanelProps {
  insights: InsightsResponse | null
  loading: boolean
  error: string | null
}

export function InsightsPanel({ insights, loading, error }: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-600">Failed to load insights: {error}</p>
      </div>
    )
  }

  if (!insights) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Health Score & Key Insights */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <p className="mt-1 text-sm text-gray-500">
              Powered by machine learning analysis
            </p>
          </div>
          <HealthScoreBadge score={insights.healthScore} />
        </div>

        {/* Key Insights */}
        {insights.keyInsights.length > 0 && (
          <div className="mt-4 space-y-2">
            {insights.keyInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="mt-0.5 flex-shrink-0">
                  {insight.startsWith('  ') ? '↳' : '•'}
                </span>
                <span className={insight.startsWith('  ') ? 'text-gray-600' : ''}>
                  {insight.trim()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout for Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Anomalies */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Performance Anomalies</h4>
            <div className="flex items-center gap-2">
              {insights.anomalies.critical > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {insights.anomalies.critical} critical
                </span>
              )}
              {insights.anomalies.warning > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  {insights.anomalies.warning} warning
                </span>
              )}
            </div>
          </div>

          {insights.anomalies.items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No anomalies detected. Performance is within normal ranges.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {insights.anomalies.items.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`rounded-md p-3 ${
                    anomaly.severity === 'critical'
                      ? 'bg-red-50'
                      : 'bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          anomaly.severity === 'critical'
                            ? 'text-red-800'
                            : 'text-yellow-800'
                        }`}
                      >
                        {anomaly.campaignName}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          anomaly.severity === 'critical'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {anomaly.metric.toUpperCase()}{' '}
                        {anomaly.direction === 'increase' ? '↑' : '↓'}{' '}
                        {Math.abs(anomaly.deviationPct).toFixed(1)}%
                      </p>
                    </div>
                    <ProviderBadge provider={anomaly.provider} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Recommendations */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h4 className="font-medium text-gray-900">Budget Recommendations</h4>

          {insights.budgetRecommendations.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No budget changes recommended. Current allocation looks optimal.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {insights.budgetRecommendations.slice(0, 5).map((rec, idx) => (
                <div
                  key={idx}
                  className={`rounded-md p-3 ${
                    rec.changePct > 0 ? 'bg-green-50' : 'bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          rec.changePct > 0
                            ? 'text-green-800'
                            : 'text-orange-800'
                        }`}
                      >
                        {rec.campaignName}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          rec.changePct > 0
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}
                      >
                        ${rec.currentBudget.toFixed(0)} → $
                        {rec.recommendedBudget.toFixed(0)}/day ({rec.changePct > 0 ? '+' : ''}
                        {rec.changePct.toFixed(0)}%)
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{rec.reason}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        rec.priority === 'high'
                          ? 'bg-purple-100 text-purple-700'
                          : rec.priority === 'medium'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Forecasts */}
      {insights.forecasts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h4 className="font-medium text-gray-900">Performance Forecasts</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {insights.forecasts.map((forecast) => (
              <div
                key={forecast.metric}
                className="rounded-lg bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {forecast.metricName}
                  </span>
                  <TrendBadge trend={forecast.trend} trendPct={forecast.trendPct} />
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatForecastValue(forecast.metric, forecast.nextPeriodForecast)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Next 30 days ({forecast.confidence} confidence)
                  </p>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <span>
                    Current period:{' '}
                    {formatForecastValue(forecast.metric, forecast.currentPeriodActual)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pacing Status */}
      {insights.pacing.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h4 className="font-medium text-gray-900">Budget Pacing</h4>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Campaign
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Spent
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Budget
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {insights.pacing.slice(0, 5).map((p, idx) => (
                  <tr key={idx}>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                      {p.campaignName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <PacingBadge status={p.pacingStatus} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-700">
                      ${p.spentToDate.toFixed(0)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-700">
                      ${p.periodBudget.toFixed(0)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right text-sm ${
                        p.projectedVariance > 0
                          ? 'text-red-600'
                          : p.projectedVariance < 0
                            ? 'text-green-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {p.projectedVariance > 0 ? '+' : ''}
                      ${p.projectedVariance.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function HealthScoreBadge({ score }: { score: number }) {
  let bgColor = 'bg-green-100'
  let textColor = 'text-green-700'
  let label = 'Healthy'

  if (score < 60) {
    bgColor = 'bg-red-100'
    textColor = 'text-red-700'
    label = 'Needs Attention'
  } else if (score < 80) {
    bgColor = 'bg-yellow-100'
    textColor = 'text-yellow-700'
    label = 'Fair'
  }

  return (
    <div className={`rounded-lg ${bgColor} px-3 py-2 text-center`}>
      <p className={`text-2xl font-bold ${textColor}`}>{score}</p>
      <p className={`text-xs ${textColor}`}>{label}</p>
    </div>
  )
}

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        provider === 'google_ads'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-indigo-100 text-indigo-700'
      }`}
    >
      {provider === 'google_ads' ? 'G' : 'M'}
    </span>
  )
}

function TrendBadge({ trend, trendPct }: { trend: string; trendPct: number }) {
  if (trend === 'stable') {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        Stable
      </span>
    )
  }

  const isUp = trend === 'up'
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
        isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isUp ? '↑' : '↓'} {Math.abs(trendPct).toFixed(1)}%
    </span>
  )
}

function PacingBadge({ status }: { status: string }) {
  const configs = {
    on_track: { bg: 'bg-green-100', text: 'text-green-700', label: 'On Track' },
    underspending: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: 'Underspending',
    },
    overspending: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Overspending',
    },
  }

  const config = configs[status as keyof typeof configs] || configs.on_track

  return (
    <span
      className={`rounded-full ${config.bg} ${config.text} px-2 py-0.5 text-xs font-medium`}
    >
      {config.label}
    </span>
  )
}

function formatForecastValue(metric: string, value: number): string {
  if (metric === 'spend') {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
