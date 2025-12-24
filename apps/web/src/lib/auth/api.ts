/**
 * API route auth utilities
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './email-auth'
import { authConfig } from './config'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

/**
 * Get the current authenticated user from a request
 */
export async function getRequestUser(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get(authConfig.cookieName)?.value

  if (!token) {
    return null
  }

  const user = await getCurrentUser(token)
  return user ?? null
}

/**
 * Require authentication for an API route
 * Returns the user if authenticated, or an error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthUser | NextResponse> {
  const user = await getRequestUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return user
}

/**
 * Type guard to check if requireAuth returned a user or error response
 */
export function isAuthUser(
  result: AuthUser | NextResponse
): result is AuthUser {
  return 'id' in result && 'email' in result
}
