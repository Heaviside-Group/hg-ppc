/**
 * Server-side auth utilities
 */
import { cookies } from 'next/headers'
import { getCurrentUser } from './email-auth'
import { authConfig } from './config'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

/**
 * Get the current authenticated user in a server component
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(authConfig.cookieName)?.value

  if (!token) {
    return null
  }

  const user = await getCurrentUser(token)
  return user ?? null
}
