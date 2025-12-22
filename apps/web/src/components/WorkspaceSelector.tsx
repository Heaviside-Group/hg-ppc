'use client'

import { Fragment } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export function WorkspaceSelector() {
  const { workspace, workspaces, setWorkspace, loading } = useWorkspace()

  if (loading) {
    return (
      <div className="h-10 w-48 animate-pulse rounded-md bg-gray-200" />
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No workspaces available
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={workspace?.id || ''}
        onChange={(e) => {
          const selected = workspaces.find((w) => w.id === e.target.value)
          if (selected) {
            setWorkspace(selected)
          }
        }}
        className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
    </div>
  )
}
