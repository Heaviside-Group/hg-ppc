'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useToast } from '@/contexts/ToastContext'

interface Integration {
  id: string
  provider: 'google_ads' | 'meta'
  status: 'active' | 'pending' | 'revoked' | 'error'
  managerAccountId: string | null
  businessId: string | null
  accountCount: number
  createdAt: string
}

const PROVIDER_INFO = {
  google_ads: {
    name: 'Google Ads',
    description: 'Connect your Google Ads Manager (MCC) account.',
    connectPath: '/api/integrations/google/connect',
  },
  meta: {
    name: 'Meta Ads',
    description: 'Connect your Meta Business and ad accounts.',
    connectPath: '/api/integrations/meta/connect',
  },
}

export default function IntegrationsPage() {
  const { workspace } = useWorkspace()
  const { addToast } = useToast()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  // Handle success/error query params from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      const messages: Record<string, string> = {
        google_connected: 'Google Ads connected successfully!',
        google_reconnected: 'Google Ads reconnected successfully!',
        meta_connected: 'Meta Ads connected successfully!',
        meta_reconnected: 'Meta Ads reconnected successfully!',
      }
      addToast('success', messages[success] || 'Integration connected!')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings/integrations')
    }

    if (error) {
      const messages: Record<string, string> = {
        missing_params: 'OAuth flow was interrupted. Please try again.',
        invalid_state: 'Security validation failed. Please try again.',
        no_refresh_token: 'Could not get refresh token. Please disconnect and reconnect.',
        callback_failed: 'Connection failed. Please try again.',
        access_denied: 'Access was denied. Please grant the required permissions.',
      }
      addToast('error', messages[error] || `Connection error: ${error}`)
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings/integrations')
    }
  }, [searchParams, addToast])

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false)
      return
    }

    async function fetchIntegrations() {
      try {
        const response = await fetch(`/api/integrations?workspaceId=${workspace!.id}`)
        if (response.ok) {
          const data = await response.json()
          setIntegrations(data.integrations || [])
        } else {
          addToast('error', 'Failed to load integrations')
        }
      } catch {
        addToast('error', 'Network error loading integrations')
      } finally {
        setLoading(false)
      }
    }

    fetchIntegrations()
  }, [workspace?.id, addToast])

  const getIntegrationByProvider = (provider: 'google_ads' | 'meta') => {
    return integrations.find((i) => i.provider === provider)
  }

  const handleConnect = (provider: 'google_ads' | 'meta') => {
    if (!workspace?.id) {
      addToast('error', 'Please select a workspace first')
      return
    }

    const connectPath = PROVIDER_INFO[provider].connectPath
    // Redirect to OAuth connect endpoint
    window.location.href = `${connectPath}?workspaceId=${workspace.id}`
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? This will remove all synced data.')) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setIntegrations((prev) => prev.filter((i) => i.id !== integrationId))
        addToast('success', 'Integration disconnected successfully')
      } else {
        addToast('error', 'Failed to disconnect integration')
      }
    } catch {
      addToast('error', 'Network error disconnecting integration')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-gray-600">
          Connect your advertising platforms to sync data automatically.
        </p>
      </div>

      {!workspace ? (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Please select or create a workspace before connecting integrations.
          </p>
        </div>
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="h-6 w-32 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
              <div className="mt-4 h-9 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {(['google_ads', 'meta'] as const).map((provider) => {
            const info = PROVIDER_INFO[provider]
            const integration = getIntegrationByProvider(provider)
            const isConnected = integration?.status === 'active'

            return (
              <div
                key={provider}
                className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {info.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {info.description}
                    </p>
                  </div>
                  {isConnected && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Connected
                    </span>
                  )}
                  {integration?.status === 'pending' && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      Pending
                    </span>
                  )}
                  {integration?.status === 'error' && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Error
                    </span>
                  )}
                </div>

                {isConnected && integration && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>
                      {integration.accountCount} ad account{integration.accountCount !== 1 ? 's' : ''} connected
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleConnect(provider)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        Reconnect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(integration!.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(provider)}
                      className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-900">Need help?</h4>
        <p className="mt-1 text-sm text-gray-600">
          Make sure you have admin access to the ad accounts you want to connect.
          For Google Ads, you&apos;ll need access to the Manager (MCC) account.
          For Meta, you&apos;ll need Business Manager admin access.
        </p>
      </div>
    </div>
  )
}
