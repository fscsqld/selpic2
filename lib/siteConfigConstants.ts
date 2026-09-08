/** Single-row key for the full Zustand persist payload (partialize shape). */
export const STOREFRONT_CMS_CONFIG_KEY = 'storefront_cms'
/** Single-row key for shared storefront product catalog snapshot. */
export const STOREFRONT_CATALOG_CONFIG_KEY = 'storefront_catalog'
/** Single-row key for shared storefront media metadata snapshot. */
export const STOREFRONT_MEDIA_CONFIG_KEY = 'storefront_media'
/**
 * Single-row key for Community agent HITL draft queue (Wave 5).
 * Shared across local + Vercel via Supabase — not the gitignored JSON file alone.
 */
export const AGENT_COMMUNITY_DRAFT_QUEUE_CONFIG_KEY = 'agent_community_draft_queue'
/**
 * Agent OpenAI usage / Phase B2 run log (HITL calls only).
 * Shared via site_configs — not accounting IndexedDB.
 */
export const AGENT_RUNS_CONFIG_KEY = 'agent_openai_runs'
/**
 * Wave 4.5 Site Review reports / findings baseline (HITL L0).
 * Shared via site_configs — not accounting IndexedDB; never auto-edits homepage.
 */
export const AGENT_SITE_REVIEW_CONFIG_KEY = 'agent_site_review_reports'

/**
 * sessionStorage: last `NEXT_PUBLIC_DEPLOY_VERSION` for which we merged remote CMS.
 * When it differs from the current build (e.g. new deploy), ContentStoreSupabaseSync clears
 * its signature cache so iPad Safari cannot keep an old `content-store` snapshot as canonical.
 */
export const SELPIC_CMS_BUILD_APPLIED_SESSION_KEY = 'selpic-cms-build-applied'
