import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'

export default async function HomePage() {
  const user = await getServerUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          HG PPC
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Multi-workspace Google Ads + Meta Ads platform
        </p>
        <div className="mt-8">
          <a
            href="/login"
            className="rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  )
}
