/**
 * Etsy Open API v3 — OAuth paths & scopes used by this app.
 * @see https://developer.etsy.com/documentation/essentials/authentication
 */

/** Relative path only — full URL = `{your-site-origin}{ETSY_OAUTH_CALLBACK_PATH}`. */
export const ETSY_OAUTH_CALLBACK_PATH = '/api/admin/integrations/etsy/oauth/callback' as const

/**
 * Space-separated scopes for seller dashboard: shop, receipts/transactions, buyer addresses, listings.
 * Re-authorize after changing this list.
 */
export const ETSY_OAUTH_SCOPES = [
  'shops_r',
  'transactions_r',
  'address_r',
  'listings_r',
  'listings_w',
].join(' ')

/** Official token endpoint from Etsy OpenAPI spec (override with `ETSY_OAUTH_TOKEN_URL` if needed). */
export const ETSY_OAUTH_TOKEN_URL_DEFAULT = 'https://openapi.etsy.com/v3/public/oauth/token'
