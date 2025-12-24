/**
 * Google Ads OAuth 2.0 helpers.
 *
 * Handles the OAuth flow for connecting Google Ads accounts:
 * 1. Generate authorization URL with proper scopes
 * 2. Exchange authorization code for tokens
 * 3. Refresh access tokens when expired
 */

import crypto from 'crypto'

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Google Ads scope
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  scope: string
}

export interface GoogleStatePayload {
  workspaceId: string
  userId: string
  timestamp: number
  nonce: string
}

/**
 * Generate the Google OAuth authorization URL.
 *
 * @param workspaceId - The workspace to associate the integration with
 * @param userId - The user initiating the connection
 * @returns Authorization URL to redirect the user to
 */
export function getGoogleAuthUrl(workspaceId: string, userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = getRedirectUri()

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  }

  // Generate state with payload
  const state = generateState(workspaceId, userId)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_ADS_SCOPE,
    access_type: 'offline', // Required to get refresh token
    prompt: 'consent', // Force consent to always get refresh token
    state,
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access and refresh tokens.
 *
 * @param code - The authorization code from Google callback
 * @returns Token response including refresh token
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = getRedirectUri()

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  }
}

/**
 * Refresh an access token using a refresh token.
 *
 * @param refreshToken - The refresh token to use
 * @returns New access token and expiry
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh access token: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
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
  const payload: GoogleStatePayload = {
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
export function verifyState(state: string): GoogleStatePayload {
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

  const payload = JSON.parse(payloadJson) as GoogleStatePayload

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
  return `${baseUrl}/api/integrations/google/callback`
}

/**
 * Fetch accessible Google Ads accounts using the CustomerService.
 *
 * @param accessToken - Valid access token
 * @returns List of accessible customer IDs
 */
export async function listAccessibleAccounts(accessToken: string): Promise<
  Array<{
    customerId: string
    descriptiveName: string
    currencyCode: string
    timeZone: string
    manager: boolean
  }>
> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN

  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not configured')
  }

  // Use the Google Ads REST API to list accessible customers
  const response = await fetch(
    'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list accessible customers: ${error}`)
  }

  const data = await response.json()
  const resourceNames: string[] = data.resourceNames || []

  // Fetch details for each customer
  const accounts = await Promise.all(
    resourceNames.map(async (resourceName) => {
      const customerId = resourceName.replace('customers/', '')
      const details = await fetchCustomerDetails(accessToken, customerId, developerToken)
      return details
    })
  )

  return accounts.filter((a) => a !== null) as Array<{
    customerId: string
    descriptiveName: string
    currencyCode: string
    timeZone: string
    manager: boolean
  }>
}

/**
 * Fetch details for a specific customer.
 */
async function fetchCustomerDetails(
  accessToken: string,
  customerId: string,
  developerToken: string
): Promise<{
  customerId: string
  descriptiveName: string
  currencyCode: string
  timeZone: string
  manager: boolean
} | null> {
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': customerId,
        },
      }
    )

    if (!response.ok) {
      console.error(`Failed to fetch customer ${customerId}: ${response.status}`)
      return null
    }

    const data = await response.json()

    return {
      customerId,
      descriptiveName: data.descriptiveName || `Account ${customerId}`,
      currencyCode: data.currencyCode || 'USD',
      timeZone: data.timeZone || 'America/New_York',
      manager: data.manager || false,
    }
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error)
    return null
  }
}
