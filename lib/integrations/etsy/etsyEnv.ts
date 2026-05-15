import 'server-only'

import { ETSY_OAUTH_TOKEN_URL_DEFAULT } from '@/lib/integrations/etsy/etsyOAuthConfig'

/**
 * Etsy app Keystring (Client ID). Prefer `ETSY_CLIENT_ID`; `ETSY_API_KEY` is a legacy alias.
 * Sent as `client_id` (OAuth) and as the **left side** of `x-api-key` on REST calls.
 */
export function getEtsyClientId(): string {
  return (process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY || '').trim()
}

/** Shared secret when Etsy issues one for your app (OAuth token body + Open API `x-api-key` suffix). */
export function getEtsyClientSecret(): string | undefined {
  const s = process.env.ETSY_CLIENT_SECRET?.trim()
  return s || undefined
}

/**
 * Value for Open API v3 `Authorization: Bearer` companion header `x-api-key`.
 * Etsy requires `KEYSTRING:SHARED_SECRET` (not keystring alone).
 * @see https://developer.etsy.com/documentation/essentials/requests
 */
export function getEtsyOpenApiXApiKey(): string {
  const id = getEtsyClientId()
  const secret = getEtsyClientSecret()?.trim()
  if (!id || !secret) return ''
  return `${id}:${secret}`
}

export function getEtsyOAuthRedirectUri(): string {
  return (process.env.ETSY_OAUTH_REDIRECT_URI || '').trim()
}

/** Token exchange / refresh URL — defaults to official OpenAPI host (`openapi.etsy.com`). */
export function getEtsyOAuthTokenUrl(): string {
  const u = process.env.ETSY_OAUTH_TOKEN_URL?.trim()
  return u || ETSY_OAUTH_TOKEN_URL_DEFAULT
}
