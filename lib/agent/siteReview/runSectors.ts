/**
 * Site Review sector ids for a manual/cron run (pure — safe for unit tests).
 */

export type SiteReviewRunSector =
  | 'storefront'
  | 'fundraising'
  | 'inbound'
  | 'performance'
  | 'community'
  | 'newsletter'
  | 'products'

export const ALL_RUN_SECTORS: SiteReviewRunSector[] = [
  'storefront',
  'fundraising',
  'inbound',
  'performance',
  'community',
  'newsletter',
  'products',
]

export function parseSiteReviewRunSectors(raw: unknown): SiteReviewRunSector[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_RUN_SECTORS]
  const allowed = new Set(ALL_RUN_SECTORS)
  const out: SiteReviewRunSector[] = []
  for (const item of raw) {
    const id = String(item || '').trim() as SiteReviewRunSector
    if (allowed.has(id) && !out.includes(id)) out.push(id)
  }
  return out.length ? out : [...ALL_RUN_SECTORS]
}
