/** Single-row key for the full Zustand persist payload (partialize shape). */
export const STOREFRONT_CMS_CONFIG_KEY = 'storefront_cms'
/** Single-row key for shared storefront product catalog snapshot. */
export const STOREFRONT_CATALOG_CONFIG_KEY = 'storefront_catalog'
/** Single-row key for shared storefront media metadata snapshot. */
export const STOREFRONT_MEDIA_CONFIG_KEY = 'storefront_media'

/**
 * sessionStorage: last `NEXT_PUBLIC_DEPLOY_VERSION` for which we merged remote CMS.
 * When it differs from the current build (e.g. new deploy), ContentStoreSupabaseSync clears
 * its signature cache so iPad Safari cannot keep an old `content-store` snapshot as canonical.
 */
export const SELPIC_CMS_BUILD_APPLIED_SESSION_KEY = 'selpic-cms-build-applied'
