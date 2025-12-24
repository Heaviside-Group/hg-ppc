/**
 * Authentication Configuration
 */
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || '',
  jwtAlgorithm: 'HS256' as const,
  jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '48', 10),
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || 'heavisidegroup.com',
  authCodeLength: 6,
  authCodeTtlSeconds: 600, // 10 minutes
  sesFromEmail: process.env.SES_FROM_EMAIL || 'noreply@heavisideppc.com',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  cookieName: 'hg-ppc-session',
}

export function validateConfig(): void {
  if (!authConfig.jwtSecret || authConfig.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
}
