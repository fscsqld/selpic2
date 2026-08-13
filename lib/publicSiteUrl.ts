/**
 * Single public storefront origin for SEO, sitemap, robots, and absolute links.
 * Live production serves https://www.selpic.com.au (apex 307 → www).
 * Never emit apex as canonical — that creates GSC “alternate with proper canonical” loops.
 */
import { COMPANY_WEBSITE_URL } from './companyLegal'

/** Hostname Google + browsers should treat as primary (no protocol). */
export const PUBLIC_SITE_HOST = 'www.selpic.com.au' as const

export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || COMPANY_WEBSITE_URL).trim().replace(/\/$/, '')
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    if (u.hostname === 'selpic.com.au' || u.hostname === 'www.selpic.com.au') {
      u.protocol = 'https:'
      u.hostname = PUBLIC_SITE_HOST
      u.pathname = ''
      u.search = ''
      u.hash = ''
      return u.origin
    }
    return u.origin
  } catch {
    return COMPANY_WEBSITE_URL
  }
}
