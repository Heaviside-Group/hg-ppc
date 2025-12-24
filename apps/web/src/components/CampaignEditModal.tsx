'use client'

import { useState, useEffect } from 'react'
import type { CampaignData } from './CampaignTable'

interface CampaignEditModalProps {
  campaign: CampaignData | null
  isOpen: boolean
  onClose: () => void
  onSave: (updates: CampaignUpdates) => Promise<void>
}

export interface CampaignUpdates {
  status?: 'enabled' | 'paused'
  dailyBudget?: number
}

export function CampaignEditModal({
  campaign,
  isOpen,
  onClose,
  onSave,
}: CampaignEditModalProps) {
  const [status, setStatus] = useState<'enabled' | 'paused'>('enabled')
  const [dailyBudget, setDailyBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when campaign changes
  useEffect(() => {
    if (campaign) {
      setStatus(campaign.status as 'enabled' | 'paused')
      setDailyBudget(campaign.dailyBudget?.toFixed(2) || '')
      setError(null)
    }
  }, [campaign])

  if (!isOpen || !campaign) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const updates: CampaignUpdates = {}

      // Only include changed values
      if (status !== campaign.status) {
        updates.status = status
      }

      const newBudget = parseFloat(dailyBudget)
      if (!isNaN(newBudget) && newBudget !== campaign.dailyBudget) {
        updates.dailyBudget = newBudget
      }

      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      await onSave(updates)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  const getProviderName = (provider: string) => {
    return provider === 'google_ads' ? 'Google Ads' : 'Meta Ads'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Campaign
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {getProviderName(campaign.provider)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Campaign Name (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Campaign Name
                </label>
                <p className="mt-1 text-sm text-gray-900">{campaign.name}</p>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('enabled')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                      status === 'enabled'
                        ? 'bg-green-100 text-green-800 ring-2 ring-green-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('paused')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                      status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Paused
                  </button>
                </div>
              </div>

              {/* Daily Budget */}
              <div>
                <label
                  htmlFor="dailyBudget"
                  className="block text-sm font-medium text-gray-700"
                >
                  Daily Budget
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    id="dailyBudget"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    step="0.01"
                    min="0"
                    className="block w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                {campaign.dailyBudget && (
                  <p className="mt-1 text-xs text-gray-500">
                    Current: ${campaign.dailyBudget.toFixed(2)}/day
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Info Message */}
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  Changes will be applied to {getProviderName(campaign.provider)}{' '}
                  within a few seconds. The dashboard will update immediately.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
