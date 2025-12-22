'use client'

import { useWorkspace } from '@/contexts/WorkspaceContext'

const integrations = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Connect your Google Ads Manager (MCC) account.',
    logo: '/google-ads-logo.svg',
    connected: false,
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Connect your Meta Business and ad accounts.',
    logo: '/meta-logo.svg',
    connected: false,
  },
]

export default function IntegrationsPage() {
  const { workspace } = useWorkspace()

  const handleConnect = (integrationId: string) => {
    // TODO: Implement OAuth flow in Phase 1
    alert(`OAuth flow for ${integrationId} will be implemented in Phase 1`)
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
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {integration.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {integration.description}
                  </p>
                </div>
                {integration.connected && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Connected
                  </span>
                )}
              </div>

              <div className="mt-4">
                {integration.connected ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Manage Connection
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnect(integration.id)}
                    className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
