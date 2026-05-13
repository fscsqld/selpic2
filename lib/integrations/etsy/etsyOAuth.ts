import 'server-only'

import { createHash, randomBytes } from 'crypto'
import { getEtsyOAuthTokenUrl } from '@/lib/integrations/etsy/etsyEnv'

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function generateOauthState(): string {
  return randomBytes(24).toString('base64url')
}

export function extractEtsyUserIdFromAccessToken(accessToken: string): string | null {
  const prefix = accessToken.split('.')[0]?.trim()
  if (prefix && /^\d+$/.test(prefix)) return prefix
  return null
}

export async function exchangeEtsyAuthorizationCode(params: {
  clientId: string
  clientSecret?: string
  redirectUri: string
  code: string
  codeVerifier: string
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  })
  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }
  const tokenUrl = getEtsyOAuthTokenUrl()
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const js = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof js.error_description === 'string'
        ? js.error_description
        : typeof js.error === 'string'
          ? js.error
          : 'Etsy token exchange failed'
    throw new Error(msg)
  }
  return js as { access_token: string; refresh_token: string; expires_in: number }
}

export async function refreshEtsyAccessToken(
  clientId: string,
  refreshToken: string,
  clientSecret?: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  })
  if (clientSecret) {
    body.set('client_secret', clientSecret)
  }
  const tokenUrl = getEtsyOAuthTokenUrl()
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const js = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof js.error_description === 'string'
        ? js.error_description
        : typeof js.error === 'string'
          ? js.error
          : 'Etsy token refresh failed'
    throw new Error(msg)
  }
  return js as { access_token: string; refresh_token: string; expires_in: number }
}
