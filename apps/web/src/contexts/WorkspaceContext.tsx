'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Workspace {
  id: string
  name: string
  slug: string
}

interface WorkspaceContextType {
  workspace: Workspace | null
  workspaces: Workspace[]
  setWorkspace: (workspace: Workspace) => void
  loading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const response = await fetch('/api/workspaces')
        if (response.ok) {
          const data = await response.json()
          setWorkspaces(data.workspaces || [])

          // Set first workspace as default if none selected
          if (data.workspaces?.length > 0 && !workspace) {
            const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId')
            const savedWorkspace = data.workspaces.find(
              (w: Workspace) => w.id === savedWorkspaceId
            )
            setWorkspaceState(savedWorkspace || data.workspaces[0])
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkspaces()
  }, [])

  const setWorkspace = (ws: Workspace) => {
    setWorkspaceState(ws)
    localStorage.setItem('selectedWorkspaceId', ws.id)
  }

  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaces, setWorkspace, loading }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
