/**
 * Single public storefront origin for SEO, sitemap, robots, and absolute links.
 * Live production serves https://www.selpic.com.au (apex 307 → www).
 * Never emit apex as canonical — that creates GSC “alternate with proper canonical” loops.
 *
 * Partner-facing fundraising docs/emails must use getPartnerFacingSiteUrl() — never
 * localhost, LAN IPs, or Vercel preview hosts, even when NEXT_PUBLIC_SITE_URL is local.
 */
import { COMPANY_WEBSITE_URL } from './companyLegal'

/** Hostname Google + browsers should treat as primary (no protocol). */
export const PUBLIC_SITE_HOST = 'www.selpic.com.au' as const

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
}

/** Origins that must never appear in partner-facing documents or emails. */
export function isUnsuitablePublicHostname(hostname: string): boolean {
  const h = normalizeHostname(hostname)
  if (!h) return true
  if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h.endsWith('.vercel.app') || h.endsWith('.now.sh')) return true
  // Any raw IP (LAN / link-local / loopback) — partners cannot open these.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true
  return false
}

/** Official live storefront origin for partner documents, Lookup links, and emails. */
export function getPartnerFacingSiteUrl(): string {
  return COMPANY_WEBSITE_URL.replace(/\/$/, '')
}

/**
 * Rewrite localhost / LAN / Vercel-preview / apex http(s) absolute URLs in HTML
 * to the live www host, keeping path + query + hash. Leaves Stripe/Supabase/etc. alone.
 */
export function rewriteHtmlUnsuitableOriginsToPublicSite(html: string): string {
  if (!html) return html
  const publicOrigin = getPartnerFacingSiteUrl()
  return html.replace(/\bhttps?:\/\/[^\s"'<>]+/gi, (url) => {
    try {
      const u = new URL(url)
      const host = normalizeHostname(u.hostname)
      const shouldRewrite =
        isUnsuitablePublicHostname(host) ||
        host === 'selpic.com.au' ||
        (host === PUBLIC_SITE_HOST && u.protocol === 'http:')
      if (!shouldRewrite) return url
      return `${publicOrigin}${u.pathname}${u.search}${u.hash}`
    } catch {
      return url
    }
  })
}

export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || COMPANY_WEBSITE_URL).trim().replace(/\/$/, '')
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    if (isUnsuitablePublicHostname(u.hostname)) {
      return COMPANY_WEBSITE_URL
    }
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
