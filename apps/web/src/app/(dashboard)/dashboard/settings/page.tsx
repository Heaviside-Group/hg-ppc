'use client'

import Link from 'next/link'

const settingsNav = [
  {
    name: 'Integrations',
    href: '/dashboard/settings/integrations',
    description: 'Connect and manage your Google Ads and Meta Ads accounts.',
  },
  {
    name: 'Team',
    href: '/dashboard/settings/team',
    description: 'Manage team members and their permissions.',
  },
  {
    name: 'Workspace',
    href: '/dashboard/settings/workspace',
    description: 'Configure workspace settings and preferences.',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your workspace settings and integrations.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {settingsNav.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-primary-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              {item.name}
            </h3>
            <p className="mt-2 text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
