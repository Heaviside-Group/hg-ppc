/**
 * GET /api/auth/me
 * Get the current authenticated user
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/email-auth'
import { authConfig } from '@/lib/auth/config'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(authConfig.cookieName)?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getCurrentUser(token)

    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json(
        { success: false, message: 'Session expired' },
        { status: 401 }
      )
      response.cookies.set(authConfig.cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return response
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Error in me:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
