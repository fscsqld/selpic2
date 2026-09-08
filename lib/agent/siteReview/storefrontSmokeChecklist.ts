/**
 * Fixed storefront smoke checklist for Site Review (read-only HTTP/path inventory).
 * Home is included for availability smoke — never rewrite Hero / app/page.tsx.
 */

export type StorefrontSmokeCheck = {
  /** Stable fingerprint seed (path + check id). */
  id: string
  path: string
  label: string
  /** Expect 2xx/3xx unless noted later in runner. */
  critical: boolean
}

/**
 * Paths relative to public site origin (e.g. https://www.selpic.com.au).
 * Keep short — expand in S1 only with tests.
 */
export const STOREFRONT_SMOKE_CHECKS: readonly StorefrontSmokeCheck[] = [
  { id: 'home', path: '/', label: 'Homepage', critical: true },
  { id: 'fundraising', path: '/fundraising', label: 'Fundraising landing', critical: true },
  { id: 'community', path: '/community', label: 'Community / SELPIC N', critical: false },
  { id: 'hot-goods', path: '/hot-goods', label: 'Hot goods', critical: false },
  { id: 'stickers', path: '/stickers', label: 'Stickers category', critical: false },
  { id: 'contact', path: '/contact', label: 'Contact', critical: false },
] as const

export function storefrontSmokeFingerprint(checkId: string, path: string): string {
  return buildSiteReviewFingerprint(['storefront_smoke', checkId, path])
}

/** Shared fingerprint helper — order-stable, lowercased tokens. */
export function buildSiteReviewFingerprint(parts: Array<string | number | null | undefined>): string {
  const tokens = parts
    .map((p) => String(p ?? '').trim().toLowerCase())
    .filter(Boolean)
  return tokens.join('|').slice(0, 240)
}
