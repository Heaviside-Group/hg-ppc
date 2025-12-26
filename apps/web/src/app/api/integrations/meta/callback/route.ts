/**
 * Meta Ads OAuth callback route.
 *
 * Handles the OAuth callback from Meta:
 * 1. Validates state parameter for CSRF protection
 * 2. Exchanges authorization code for short-lived token
 * 3. Exchanges for long-lived token (~60 days)
 * 4. Encrypts and stores tokens
 * 5. Creates integration record
 * 6. Discovers and creates ad accounts
 * 7. Redirects to success page
 */

import { NextResponse } from 'next/server'
import { getDb, integrations, integrationCredentials, adAccounts } from '@hg-ppc/db'
import { encryptJson } from '@/lib/encryption'
import {
  verifyState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listAccessibleAdAccounts,
} from '@/lib/oauth/meta'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')

    // Handle OAuth errors
    if (error) {
      console.error('Meta OAuth error:', error, errorReason)
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

    // Exchange code for short-lived token
    const shortLivedToken = await exchangeCodeForToken(code)

    // Exchange for long-lived token
    const longLivedToken = await exchangeForLongLivedToken(
      shortLivedToken.accessToken
    )

    const db = getDb()

    // Check if integration already exists for this workspace
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.provider, 'meta')
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
        accessToken: longLivedToken.accessToken,
        expiresAt: longLivedToken.expiresAt.toISOString(),
      })

      await db
        .update(integrationCredentials)
        .set({
          encryptedBlob: encryptedTokens.encryptedBlob,
          iv: encryptedTokens.iv,
          authTag: encryptedTokens.authTag,
          expiresAt: longLivedToken.expiresAt,
          tokenType: 'bearer',
          updatedAt: new Date(),
        })
        .where(eq(integrationCredentials.integrationId, existingIntegration.id))

      // Discover and sync accounts
      await syncAdAccounts(
        db,
        existingIntegration.id,
        workspaceId,
        longLivedToken.accessToken
      )

      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?success=meta_reconnected`
      )
    }

    // Create new integration
    const [newIntegration] = await db
      .insert(integrations)
      .values({
        workspaceId,
        provider: 'meta',
        status: 'active',
      })
      .returning()

    // Encrypt and store tokens
    const encryptedTokens = encryptJson({
      accessToken: longLivedToken.accessToken,
      expiresAt: longLivedToken.expiresAt.toISOString(),
    })

    await db.insert(integrationCredentials).values({
      integrationId: newIntegration.id,
      encryptedBlob: encryptedTokens.encryptedBlob,
      iv: encryptedTokens.iv,
      authTag: encryptedTokens.authTag,
      expiresAt: longLivedToken.expiresAt,
      tokenType: 'bearer',
    })

    // Discover and create ad accounts
    await syncAdAccounts(
      db,
      newIntegration.id,
      workspaceId,
      longLivedToken.accessToken
    )

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?success=meta_connected`
    )
  } catch (error) {
    console.error('Meta OAuth callback error:', error)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=callback_failed`
    )
  }
}

/**
 * Sync ad accounts from Meta Ads API.
 */
async function syncAdAccounts(
  db: ReturnType<typeof getDb>,
  integrationId: string,
  workspaceId: string,
  accessToken: string
) {
  try {
    const accounts = await listAccessibleAdAccounts(accessToken)

    for (const account of accounts) {
      // Check if account already exists
      const existingAccount = await db.query.adAccounts.findFirst({
        where: and(
          eq(adAccounts.workspaceId, workspaceId),
          eq(adAccounts.externalId, account.id),
          eq(adAccounts.provider, 'meta')
        ),
      })

      if (existingAccount) {
        // Update existing account
        await db
          .update(adAccounts)
          .set({
            name: account.name,
            currency: account.currency,
            timezone: account.timezone,
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
          provider: 'meta',
          externalId: account.id, // act_xxx format
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          status: 'active',
        })
      }
    }
  } catch (error) {
    console.error('Failed to sync Meta ad accounts:', error)
    // Don't fail the whole flow, just log the error
    // Accounts can be synced later
  }
}
