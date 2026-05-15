/**
 * Etsy Open API v3 — OAuth paths & scopes used by this app.
 * @see https://developer.etsy.com/documentation/essentials/authentication
 */

/** Relative path only — full URL = `{your-site-origin}{ETSY_OAUTH_CALLBACK_PATH}`. */
export const ETSY_OAUTH_CALLBACK_PATH = '/api/admin/integrations/etsy/oauth/callback' as const

/**
 * Scopes requested on **Connect Etsy** (OAuth authorize URL).
 *
 * **Default (Personal Access / pending approval):** only what order import needs:
 * `shops_r`, `transactions_r`, `address_r`. This avoids requesting listing write scopes
 * that can keep OAuth stuck on “app approval is pending” for some apps.
 *
 * **Listing scopes (`listings_w`, etc.):** ignored unless `ETSY_OAUTH_INCLUDE_LISTING_SCOPES=true`.
 * When true, merges env `ETSY_OAUTH_EXTRA_SCOPES` (space-separated), redeploy, then **Connect Etsy** again.
 *
 * Re-authorize whenever this list changes.
 */
const DEFAULT_OAUTH_SCOPES = ['shops_r', 'transactions_r', 'address_r'] as const

export function getEtsyOAuthScopes(): string {
  const includeListing =
    process.env.ETSY_OAUTH_INCLUDE_LISTING_SCOPES?.trim().toLowerCase() === 'true'
  if (!includeListing) {
    return [...DEFAULT_OAUTH_SCOPES].join(' ')
  }
  const extra = process.env.ETSY_OAUTH_EXTRA_SCOPES?.trim()
  const parts = extra ? extra.split(/\s+/).filter(Boolean) : []
  const merged = [...DEFAULT_OAUTH_SCOPES, ...parts]
  return [...new Set(merged)].join(' ')
}

/** Official token endpoint from Etsy OpenAPI spec (override with `ETSY_OAUTH_TOKEN_URL` if needed). */
export const ETSY_OAUTH_TOKEN_URL_DEFAULT = 'https://openapi.etsy.com/v3/public/oauth/token'
