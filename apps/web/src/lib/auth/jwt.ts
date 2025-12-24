/**
 * JWT Token Management
 */
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { authConfig } from './config'

export interface JwtPayload {
  sub: string // userId
  email: string
  iat?: number
  exp?: number
}

/**
 * Create a JWT token for a user
 */
export function createJwtToken(email: string, userId: string): string {
  const expiresIn = authConfig.jwtExpiryHours * 60 * 60 // Convert hours to seconds

  return jwt.sign(
    { sub: userId, email } as JwtPayload,
    authConfig.jwtSecret,
    {
      algorithm: authConfig.jwtAlgorithm as jwt.Algorithm,
      expiresIn,
    }
  )
}

/**
 * Verify and decode a JWT token
 */
export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: [authConfig.jwtAlgorithm as jwt.Algorithm],
    }) as JwtPayload

    return payload
  } catch {
    return null
  }
}

/**
 * Hash a token for storage (used for session tracking)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a random 6-digit auth code
 */
export function generateAuthCode(): string {
  return Array.from(
    { length: authConfig.authCodeLength },
    () => Math.floor(Math.random() * 10).toString()
  ).join('')
}
