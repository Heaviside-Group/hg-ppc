/**
 * Google Ads OAuth callback route.
 *
 * Handles the OAuth callback from Google:
 * 1. Validates state parameter for CSRF protection
 * 2. Exchanges authorization code for tokens
 * 3. Encrypts and stores tokens
 * 4. Creates integration record
 * 5. Discovers and creates ad accounts
 * 6. Redirects to success page
 */

import { NextResponse } from 'next/server'
import { getDb, integrations, integrationCredentials, adAccounts } from '@hg-ppc/db'
import { encryptJson } from '@/lib/encryption'
import {
  verifyState,
  exchangeCodeForTokens,
  listAccessibleAccounts,
} from '@/lib/oauth/google'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?error=missing_params`
      )
    }

    // Verify state parameter
    let statePayload
    try {
      statePayload = verifyState(state)
    } catch (err) {
      console.error('Invalid state:', err)
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?error=invalid_state`
      )
    }

    const { workspaceId, userId } = statePayload

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.refreshToken) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?error=no_refresh_token`
      )
    }

    const db = getDb()

    // Check if integration already exists for this workspace
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.provider, 'google_ads')
      ),
    })

    if (existingIntegration) {
      // Update existing integration
      await db
        .update(integrations)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(integrations.id, existingIntegration.id))

      // Update credentials
      const encryptedTokens = encryptJson({
        refreshToken: tokens.refreshToken,
      })

      await db
        .update(integrationCredentials)
        .set({
          encryptedBlob: encryptedTokens.encryptedBlob,
          iv: encryptedTokens.iv,
          authTag: encryptedTokens.authTag,
          scopes: tokens.scope.split(' '),
          tokenType: tokens.tokenType,
          updatedAt: new Date(),
        })
        .where(eq(integrationCredentials.integrationId, existingIntegration.id))

      // Discover and sync accounts
      await syncAdAccounts(
        db,
        existingIntegration.id,
        workspaceId,
        tokens.accessToken
      )

      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?success=google_reconnected`
      )
    }

    // Create new integration
    const [newIntegration] = await db
      .insert(integrations)
      .values({
        workspaceId,
        provider: 'google_ads',
        status: 'active',
      })
      .returning()

    // Encrypt and store tokens
    const encryptedTokens = encryptJson({
      refreshToken: tokens.refreshToken,
    })

    await db.insert(integrationCredentials).values({
      integrationId: newIntegration.id,
      encryptedBlob: encryptedTokens.encryptedBlob,
      iv: encryptedTokens.iv,
      authTag: encryptedTokens.authTag,
      scopes: tokens.scope.split(' '),
      tokenType: tokens.tokenType,
    })

    // Discover and create ad accounts
    await syncAdAccounts(db, newIntegration.id, workspaceId, tokens.accessToken)

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?success=google_connected`
    )
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=callback_failed`
    )
  }
}

/**
 * Sync ad accounts from Google Ads API.
 */
async function syncAdAccounts(
  db: ReturnType<typeof getDb>,
  integrationId: string,
  workspaceId: string,
  accessToken: string
) {
  try {
    console.log('[Google Sync] Starting ad account discovery...')
    const accounts = await listAccessibleAccounts(accessToken)
    console.log(`[Google Sync] Found ${accounts.length} accessible accounts`)

    let synced = 0
    let skipped = 0

    for (const account of accounts) {
      console.log(`[Google Sync] Account ${account.customerId}: ${account.descriptiveName} (manager: ${account.manager})`)

      // Skip manager accounts - they can't run ads directly
      if (account.manager) {
        skipped++
        continue
      }

      // Check if account already exists
      const existingAccount = await db.query.adAccounts.findFirst({
        where: and(
          eq(adAccounts.workspaceId, workspaceId),
          eq(adAccounts.externalId, account.customerId),
          eq(adAccounts.provider, 'google_ads')
        ),
      })

      if (existingAccount) {
        // Update existing account
        await db
          .update(adAccounts)
          .set({
            name: account.descriptiveName,
            currency: account.currencyCode,
            timezone: account.timeZone,
            integrationId,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(adAccounts.id, existingAccount.id))
      } else {
        // Create new account
        await db.insert(adAccounts).values({
          workspaceId,
          integrationId,
          provider: 'google_ads',
          externalId: account.customerId,
          name: account.descriptiveName,
          currency: account.currencyCode,
          timezone: account.timeZone,
          status: 'active',
        })
      }
      synced++
    }

    console.log(`[Google Sync] Complete: ${synced} accounts synced, ${skipped} manager accounts skipped`)
  } catch (error) {
    console.error('[Google Sync] Failed to sync ad accounts:', error)
    // Don't fail the whole flow, just log the error
    // Accounts can be synced later
  }
}
