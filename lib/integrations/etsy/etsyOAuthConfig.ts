/**
 * Etsy Open API v3 — OAuth paths & scopes used by this app.
 * @see https://developer.etsy.com/documentation/essentials/authentication
 */

/** Relative path only — full URL = `{your-site-origin}{ETSY_OAUTH_CALLBACK_PATH}`. */
export const ETSY_OAUTH_CALLBACK_PATH = '/api/admin/integrations/etsy/oauth/callback' as const

/**
 * Scopes sent on **Connect Etsy** (authorize URL).
 * Fixed minimal set for shop plus receipt import only (`shops_r`, `transactions_r`, `address_r`).
 * No env reads — missing Production vars cannot affect this string at build or runtime.
 */
export function getEtsyOAuthScopes(): string {
  return 'shops_r transactions_r address_r'
}

/** Official token endpoint from Etsy OpenAPI spec (override with `ETSY_OAUTH_TOKEN_URL` if needed). */
export const ETSY_OAUTH_TOKEN_URL_DEFAULT = 'https://openapi.etsy.com/v3/public/oauth/token'
