/**
 * Email-based Authentication Service
 */
import { eq, and, gt, lt } from 'drizzle-orm'
import { getDb, users, authCodes, sessions } from '@hg-ppc/db'
import { sendAuthEmail } from '@/lib/email/ses'
import { authConfig } from './config'
import { createJwtToken, generateAuthCode, hashToken, verifyJwtToken } from './jwt'

/**
 * Check if an email is from an allowed domain
 */
export function isAllowedEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false
  const domain = email.split('@')[1].toLowerCase()
  return domain === authConfig.allowedEmailDomain
}

export interface AuthResult {
  success: boolean
  message: string
  token?: string
  user?: {
    id: string
    email: string
    name: string | null
  }
}

/**
 * Request a verification code for an email address
 */
export async function requestCode(email: string): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // Validate domain
  if (!isAllowedEmail(normalizedEmail)) {
    return {
      success: false,
      message: `Only @${authConfig.allowedEmailDomain} emails are allowed`,
    }
  }

  try {
    const db = getDb()
    const code = generateAuthCode()
    const expiresAt = new Date(Date.now() + authConfig.authCodeTtlSeconds * 1000)

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    })

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
        })
        .returning()
      user = newUser
    }

    // Delete any existing unused codes for this email
    await db
      .delete(authCodes)
      .where(
        and(
          eq(authCodes.email, normalizedEmail),
          eq(authCodes.used, false)
        )
      )

    // Store new auth code
    await db.insert(authCodes).values({
      email: normalizedEmail,
      code,
      expiresAt,
    })

    // Send email
    const sent = await sendAuthEmail(normalizedEmail, code)

    if (!sent) {
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.',
      }
    }

    return {
      success: true,
      message: 'Verification code sent to your email',
    }
  } catch (error) {
    console.error('Error requesting auth code:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    }
  }
}

/**
 * Verify an auth code and return a JWT token
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase().trim()

  // Validate domain
  if (!isAllowedEmail(normalizedEmail)) {
    return {
      success: false,
      message: 'Invalid email domain',
    }
  }

  try {
    const db = getDb()

    // Find valid auth code
    const authCode = await db.query.authCodes.findFirst({
      where: and(
        eq(authCodes.email, normalizedEmail),
        eq(authCodes.code, code),
        eq(authCodes.used, false),
        gt(authCodes.expiresAt, new Date())
      ),
    })

    if (!authCode) {
      return {
        success: false,
        message: 'Invalid or expired code',
      }
    }

    // Mark code as used
    await db
      .update(authCodes)
      .set({ used: true })
      .where(eq(authCodes.id, authCode.id))

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Create JWT token
    const token = createJwtToken(normalizedEmail, user.id)
    const tokenHash = hashToken(token)
    const expiresAt = new Date(
      Date.now() + authConfig.jwtExpiryHours * 60 * 60 * 1000
    )

    // Create session record
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    })

    return {
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  } catch (error) {
    console.error('Error verifying auth code:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    }
  }
}

/**
 * Get current user from token
 */
export async function getCurrentUser(
  token: string
): Promise<AuthResult['user'] | null> {
  try {
    const payload = verifyJwtToken(token)
    if (!payload) {
      return null
    }

    const db = getDb()
    const tokenHash = hashToken(token)

    // Verify session exists and is not expired
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      ),
      with: {
        user: true,
      },
    })

    if (!session || !session.user) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    }
  } catch {
    return null
  }
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    const db = getDb()
    const tokenHash = hashToken(token)
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
    return true
  } catch {
    return false
  }
}

/**
 * Clean up expired auth codes and sessions
 */
export async function cleanupExpired(): Promise<void> {
  const db = getDb()
  const now = new Date()

  await Promise.all([
    db.delete(authCodes).where(lt(authCodes.expiresAt, now)),
    db.delete(sessions).where(lt(sessions.expiresAt, now)),
  ])
}
