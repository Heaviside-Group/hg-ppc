/**
 * POST /api/auth/verify-code
 * Verify a verification code and return a session token
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyCode } from '@/lib/auth/email-auth'
import { authConfig } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Code is required' },
        { status: 400 }
      )
    }

    const result = await verifyCode(email, code)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // Create response with success data
    const response = NextResponse.json({
      success: true,
      message: result.message,
      user: result.user,
    })

    // Set httpOnly cookie with the token
    if (result.token) {
      response.cookies.set(authConfig.cookieName, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authConfig.jwtExpiryHours * 60 * 60, // Convert hours to seconds
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Error in verify-code:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
