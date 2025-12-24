'use client'

import { useState, useRef, useEffect } from 'react'

export interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  compareValue?: DateRange | null
  onCompareChange?: (range: DateRange | null) => void
  showComparison?: boolean
}

const presetRanges: DateRange[] = [
  {
    label: 'Last 7 days',
    startDate: getDateDaysAgo(7),
    endDate: getDateDaysAgo(0),
  },
  {
    label: 'Last 14 days',
    startDate: getDateDaysAgo(14),
    endDate: getDateDaysAgo(0),
  },
  {
    label: 'Last 30 days',
    startDate: getDateDaysAgo(30),
    endDate: getDateDaysAgo(0),
  },
  {
    label: 'Last 90 days',
    startDate: getDateDaysAgo(90),
    endDate: getDateDaysAgo(0),
  },
  {
    label: 'This month',
    startDate: getFirstDayOfMonth(),
    endDate: getDateDaysAgo(0),
  },
  {
    label: 'Last month',
    startDate: getFirstDayOfLastMonth(),
    endDate: getLastDayOfLastMonth(),
  },
]

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function getFirstDayOfMonth(): string {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function getFirstDayOfLastMonth(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function getLastDayOfLastMonth(): string {
  const date = new Date()
  date.setDate(0) // Last day of previous month
  return date.toISOString().split('T')[0]
}

function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(range.startDate)
  const end = new Date(range.endDate)
  const daysDiff = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - daysDiff)

  return {
    label: 'Previous period',
    startDate: prevStart.toISOString().split('T')[0],
    endDate: prevEnd.toISOString().split('T')[0],
  }
}

export function DateRangePicker({
  value,
  onChange,
  compareValue,
  onCompareChange,
  showComparison = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [enableComparison, setEnableComparison] = useState(!!compareValue)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetSelect = (preset: DateRange) => {
    onChange(preset)
    if (enableComparison && onCompareChange) {
      onCompareChange(getPreviousPeriod(preset))
    }
    setIsOpen(false)
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', date: string) => {
    const newRange = { ...value, [field]: date, label: 'Custom' }
    onChange(newRange)
    if (enableComparison && onCompareChange) {
      onCompareChange(getPreviousPeriod(newRange))
    }
  }

  const toggleComparison = () => {
    const newEnabled = !enableComparison
    setEnableComparison(newEnabled)
    if (onCompareChange) {
      onCompareChange(newEnabled ? getPreviousPeriod(value) : null)
    }
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          {formatDateDisplay(value.startDate)} - {formatDateDisplay(value.endDate)}
        </span>
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900">Quick Select</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {presetRanges.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      value.label === preset.label
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900">Custom Range</h4>
              <div className="mt-2 flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={value.startDate}
                    onChange={(e) =>
                      handleCustomDateChange('startDate', e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) =>
                      handleCustomDateChange('endDate', e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            {showComparison && onCompareChange && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableComparison}
                    onChange={toggleComparison}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Compare to previous period
                  </span>
                </label>
                {enableComparison && compareValue && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateDisplay(compareValue.startDate)} -{' '}
                    {formatDateDisplay(compareValue.endDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const defaultDateRange: DateRange = {
  label: 'Last 30 days',
  startDate: getDateDaysAgo(30),
  endDate: getDateDaysAgo(0),
}
