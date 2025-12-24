'use client'

interface KPICardProps {
  label: string
  value: string | number
  change?: number | null
  format?: 'number' | 'currency' | 'percent' | 'multiplier'
  loading?: boolean
  invertChange?: boolean // For metrics where decrease is good (like CPA)
}

export function KPICard({
  label,
  value,
  change,
  format = 'number',
  loading = false,
  invertChange = false,
}: KPICardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val)
      case 'percent':
        return `${val.toFixed(2)}%`
      case 'multiplier':
        return `${val.toFixed(2)}x`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 0,
        }).format(val)
    }
  }

  const formatChange = (val: number): string => {
    const sign = val >= 0 ? '+' : ''
    return `${sign}${val.toFixed(1)}%`
  }

  const getChangeColor = (val: number): string => {
    const isPositive = val > 0
    const isGood = invertChange ? !isPositive : isPositive
    if (val === 0) return 'text-gray-500'
    return isGood ? 'text-green-600' : 'text-red-600'
  }

  const getChangeIcon = (val: number) => {
    if (val === 0) return null
    const isUp = val > 0
    return (
      <svg
        className={`h-3 w-3 ${isUp ? '' : 'rotate-180'}`}
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
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-32 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-20 rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">
        {formatValue(value)}
      </p>
      {change !== null && change !== undefined && (
        <div className={`mt-1 flex items-center gap-1 text-sm ${getChangeColor(change)}`}>
          {getChangeIcon(change)}
          <span>{formatChange(change)}</span>
          <span className="text-gray-500">vs prev period</span>
        </div>
      )}
      {(change === null || change === undefined) && (
        <p className="mt-1 text-sm text-gray-400">No comparison data</p>
      )}
    </div>
  )
}

interface KPIGridProps {
  children: React.ReactNode
}

export function KPIGrid({ children }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  )
}
