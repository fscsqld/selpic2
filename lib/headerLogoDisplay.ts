/**
 * Static brand files under `public/` (e.g. footer `HeaderLogoImage` fallbacks).
 * Repo currently ships: `logo.svg`, `images/logo.svg`. PNG optional if you add them.
 */
/** PNGs are committed under public/; SVGs are optional — try PNG first for Linux/Vercel case-sensitive paths. */
export const HEADER_LOGO_STATIC_FALLBACKS: readonly string[] = [
  '/images/logo.webp',
  '/images/logo.png',
  '/logo.webp',
  '/logo.png',
  '/images/logo.svg',
  '/logo.svg',
]
