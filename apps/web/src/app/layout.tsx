import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HG PPC - Multi-Workspace Ads Platform',
  description: 'Manage Google Ads and Meta Ads across multiple workspaces',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
