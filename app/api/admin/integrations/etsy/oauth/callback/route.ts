import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  exchangeEtsyAuthorizationCode,
  extractEtsyUserIdFromAccessToken,
} from '@/lib/integrations/etsy/etsyOAuth'
import { fetchUserShops } from '@/lib/integrations/etsy/etsyOrdersClient'
import { upsertEtsyConnection } from '@/lib/integrations/etsy/etsyConnectionStore'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { getEtsyClientId, getEtsyClientSecret, getEtsyOAuthRedirectUri } from '@/lib/integrations/etsy/etsyEnv'

const STATE = 'etsy_oauth_state'
const VERIFIER = 'etsy_pkce_verifier'

/** After OAuth, send the seller back to the admin dashboard (same origin as this request). */
function redirectToAdminDashboard(request: Request, query: Record<string, string>) {
  const origin = new URL(request.url).origin
  const u = new URL('/admin/dashboard', origin)
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v)
  return NextResponse.redirect(u.toString())
}

export async function GET(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return redirectToAdminDashboard(request, { etsy: 'no_db' })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const err = url.searchParams.get('error')

  const jar = await cookies()
  const expectedState = jar.get(STATE)?.value
  const verifier = jar.get(VERIFIER)?.value
  jar.delete(STATE)
  jar.delete(VERIFIER)

  if (err) {
    return redirectToAdminDashboard(request, { etsy: 'denied', reason: err })
  }
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return redirectToAdminDashboard(request, { etsy: 'invalid_state' })
  }

  const clientId = getEtsyClientId()
  const redirectUri = getEtsyOAuthRedirectUri()
  const clientSecret = getEtsyClientSecret()
  if (!clientId || !redirectUri) {
    return redirectToAdminDashboard(request, { etsy: 'missing_env' })
  }

  try {
    const tokens = await exchangeEtsyAuthorizationCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
      codeVerifier: verifier,
    })
    const userId = extractEtsyUserIdFromAccessToken(tokens.access_token)
    if (!userId) {
      throw new Error('Could not parse Etsy user id from access token.')
    }

    const shopsBody = await fetchUserShops(userId, tokens.access_token, clientId)
    const shops = Array.isArray(shopsBody.results) ? shopsBody.results : []
    const preferred = process.env.ETSY_SHOP_ID?.trim()
    const shop =
      (preferred
        ? shops.find((s) => String((s as Record<string, unknown>).shop_id) === preferred)
        : undefined) || shops[0]
    if (!shop || typeof shop !== 'object') {
      throw new Error('No Etsy shops returned for this account.')
    }
    const so = shop as Record<string, unknown>
    const shopId = String(so.shop_id ?? '')
    const shopName = typeof so.shop_name === 'string' ? so.shop_name : null
    if (!shopId) throw new Error('Missing shop_id from Etsy.')

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
    await upsertEtsyConnection({
      shop_id: shopId,
      shop_name: shopName,
      etsy_user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    })

    return redirectToAdminDashboard(request, { etsy: 'connected' })
  } catch (e) {
    logAndSafeMessage('etsy oauth callback', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return redirectToAdminDashboard(request, { etsy: 'error', detail: encodeURIComponent(msg.slice(0, 200)) })
  }
}
