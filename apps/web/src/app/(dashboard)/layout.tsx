import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { Sidebar } from '@/components/Sidebar'
import { WorkspaceSelector } from '@/components/WorkspaceSelector'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LogoutButton } from '@/components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <WorkspaceProvider>
      <ToastProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
              <div className="flex items-center gap-4">
                <WorkspaceSelector />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <LogoutButton />
              </div>
            </header>
            <main className="flex-1 overflow-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </WorkspaceProvider>
  )
}
