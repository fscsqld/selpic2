/**
 * Public storefront CMS HTTP cache policy (CDN / browser).
 * Cousins: admin PUT freshness (30s max stale), empty config, Soft refresh after deploy.
 */

/** Successful GET /api/site-config/public */
export const PUBLIC_SITE_CONFIG_CACHE_CONTROL =
  'public, s-maxage=60, stale-while-revalidate=300'

/** Errors / misconfig — never cache */
export const PUBLIC_SITE_CONFIG_NO_STORE = 'no-store'
