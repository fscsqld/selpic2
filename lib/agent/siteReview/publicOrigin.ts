/**
 * Public origin for storefront smoke (read-only). Never scrape third-party sites.
 */

export function resolvePublicSiteOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = (env.VERCEL_URL || '').trim().replace(/\/$/, '')
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`
  return 'http://127.0.0.1:3005'
}
