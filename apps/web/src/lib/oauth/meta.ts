/**
 * Meta (Facebook) Ads OAuth 2.0 helpers.
 *
 * Handles the OAuth flow for connecting Meta Ads accounts:
 * 1. Generate authorization URL with proper scopes
 * 2. Exchange authorization code for short-lived token
 * 3. Exchange short-lived token for long-lived token (~60 days)
 * 4. Fetch accessible ad accounts
 */

import crypto from 'crypto'

// Meta OAuth endpoints
const META_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth'
const META_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'

// Meta Ads scopes
const META_SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
].join(',')

export interface MetaTokens {
  accessToken: string
  expiresIn: number
  tokenType: string
}

export interface MetaLongLivedToken {
  accessToken: string
  expiresAt: Date
}

export interface MetaStatePayload {
  workspaceId: string
  userId: string
  timestamp: number
  nonce: string
}

export interface MetaAdAccount {
  id: string
  accountId: string
  name: string
  currency: string
  timezone: string
  businessName?: string
}

/**
 * Generate the Meta OAuth authorization URL.
 *
 * @param workspaceId - The workspace to associate the integration with
 * @param userId - The user initiating the connection
 * @returns Authorization URL to redirect the user to
 */
export function getMetaAuthUrl(workspaceId: string, userId: string): string {
  const appId = process.env.META_APP_ID
  const redirectUri = getRedirectUri()

  if (!appId) {
    throw new Error('META_APP_ID environment variable is not set')
  }

  // Generate state with payload
  const state = generateState(workspaceId, userId)

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: META_SCOPES,
    state,
  })

  return `${META_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for short-lived access token.
 *
 * @param code - The authorization code from Meta callback
 * @returns Short-lived token response
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokens> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = getRedirectUri()

  if (!appId || !appSecret) {
    throw new Error('Meta OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'bearer',
  }
}

/**
 * Exchange short-lived token for long-lived token (~60 days).
 *
 * @param shortLivedToken - The short-lived access token
 * @returns Long-lived token with expiration date
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<MetaLongLivedToken> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('Meta OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange for long-lived token: ${error}`)
  }

  const data = await response.json()

  // Calculate expiration date
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in)

  return {
    accessToken: data.access_token,
    expiresAt,
  }
}

/**
 * Generate a signed state parameter for CSRF protection.
 *
 * @param workspaceId - Workspace ID to include in state
 * @param userId - User ID to include in state
 * @returns Base64-encoded state string
 */
export function generateState(workspaceId: string, userId: string): string {
  const payload: MetaStatePayload = {
    workspaceId,
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  const payloadJson = JSON.stringify(payload)
  const signature = signState(payloadJson)

  // Combine payload and signature
  const state = `${Buffer.from(payloadJson).toString('base64')}.${signature}`

  return state
}

/**
 * Verify and parse the state parameter from callback.
 *
 * @param state - The state parameter from callback
 * @returns Parsed state payload
 * @throws Error if state is invalid or expired
 */
export function verifyState(state: string): MetaStatePayload {
  const [payloadB64, signature] = state.split('.')

  if (!payloadB64 || !signature) {
    throw new Error('Invalid state format')
  }

  const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8')

  // Verify signature
  const expectedSignature = signState(payloadJson)
  if (signature !== expectedSignature) {
    throw new Error('Invalid state signature')
  }

  const payload = JSON.parse(payloadJson) as MetaStatePayload

  // Check expiry (10 minutes)
  const maxAge = 10 * 60 * 1000
  if (Date.now() - payload.timestamp > maxAge) {
    throw new Error('State has expired')
  }

  return payload
}

/**
 * Sign the state payload using HMAC-SHA256.
 */
function signState(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured')
  }

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
}

/**
 * Get the OAuth redirect URI.
 */
function getRedirectUri(): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}/api/integrations/meta/callback`
}

/**
 * Fetch accessible ad accounts for the authenticated user.
 *
 * @param accessToken - Valid access token
 * @returns List of accessible ad accounts
 */
export async function listAccessibleAdAccounts(
  accessToken: string
): Promise<MetaAdAccount[]> {
  const response = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=account_id,name,currency,timezone_name,business_name&limit=100&access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list ad accounts: ${error}`)
  }

  const data = await response.json()
  const accounts: MetaAdAccount[] = []

  for (const account of data.data || []) {
    accounts.push({
      id: account.id, // format: act_xxx
      accountId: account.account_id, // numeric ID
      name: account.name || `Ad Account ${account.account_id}`,
      currency: account.currency || 'USD',
      timezone: account.timezone_name || 'America/New_York',
      businessName: account.business_name,
    })
  }

  return accounts
}

/**
 * Get the authenticated user's info.
 *
 * @param accessToken - Valid access token
 * @returns User ID and name
 */
export async function getUserInfo(
  accessToken: string
): Promise<{ id: string; name: string }> {
  const response = await fetch(
    `${META_GRAPH_URL}/me?fields=id,name&access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  const data = await response.json()

  return {
    id: data.id,
    name: data.name,
  }
}
