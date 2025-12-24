/**
 * POST /api/auth/logout
 * Invalidate the current session and clear the cookie
 */
import { NextRequest, NextResponse } from 'next/server'
import { invalidateSession } from '@/lib/auth/email-auth'
import { authConfig } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(authConfig.cookieName)?.value

    if (token) {
      await invalidateSession(token)
    }

    // Create response
    const response = NextResponse.json({ success: true })

    // Clear the cookie
    response.cookies.set(authConfig.cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error in logout:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
