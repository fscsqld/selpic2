import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { generateOauthState, generatePkcePair } from '@/lib/integrations/etsy/etsyOAuth'
import { getEtsyClientId, getEtsyClientSecret, getEtsyOAuthRedirectUri } from '@/lib/integrations/etsy/etsyEnv'
import { getEtsyOAuthScopes } from '@/lib/integrations/etsy/etsyOAuthConfig'
import {
  ETSY_OAUTH_RETURN_COOKIE,
  sanitizeEtsyOAuthReturnPath,
} from '@/lib/integrations/etsy/etsyOAuthReturn'

const STATE = 'etsy_oauth_state'
const VERIFIER = 'etsy_pkce_verifier'

export async function GET(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = getEtsyClientId()
  const redirectUri = getEtsyOAuthRedirectUri()
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          'Missing ETSY_CLIENT_ID (or legacy ETSY_API_KEY) or ETSY_OAUTH_REDIRECT_URI. Set both to match your Etsy app registration.',
      },
      { status: 503 }
    )
  }
  if (!getEtsyClientSecret()?.trim()) {
    return NextResponse.json(
      {
        error:
          'Missing ETSY_CLIENT_SECRET. Etsy Open API v3 requires x-api-key as KEYSTRING:SHARED_SECRET — add the Shared secret from Your Etsy apps.',
      },
      { status: 503 }
    )
  }

  const returnTo = sanitizeEtsyOAuthReturnPath(new URL(request.url).searchParams.get('returnTo'))

  const state = generateOauthState()
  const { verifier, challenge } = generatePkcePair()
  const jar = await cookies()
  const secure = process.env.NODE_ENV === 'production'
  jar.set(STATE, state, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 600 })
  jar.set(VERIFIER, verifier, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 600 })
  jar.set(ETSY_OAUTH_RETURN_COOKIE, returnTo, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const scope = encodeURIComponent(getEtsyOAuthScopes())
  const url =
    `https://www.etsy.com/oauth/connect?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256`

  return NextResponse.redirect(url)
}
