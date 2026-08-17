import {
  getPartnerFacingSiteUrl,
  rewriteHtmlUnsuitableOriginsToPublicSite,
} from '@/lib/publicSiteUrl'
import type { FundraisingDocument } from '@/lib/fundraising/types'

export { getPartnerFacingSiteUrl, rewriteHtmlUnsuitableOriginsToPublicSite }

/** Official Lookup URL for partner emails and D2/D4/D18–D20 documents. */
export function buildPartnerFacingLookupUrl(token: string): string {
  const t = String(token || '').trim()
  return `${getPartnerFacingSiteUrl()}/fundraising/lookup?token=${encodeURIComponent(t)}`
}

function extractLookupToken(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const text = String(raw).trim()
  if (!text) return undefined
  try {
    const u = new URL(text, getPartnerFacingSiteUrl())
    const q = u.searchParams.get('token')
    if (q?.trim()) return q.trim()
  } catch {
    /* fall through */
  }
  const m = text.match(/[?&]token=([^&\s"'<>]+)/i)
  if (!m?.[1]) return undefined
  try {
    return decodeURIComponent(m[1]).trim()
  } catch {
    return m[1].trim()
  }
}

/**
 * Always emit https://www.selpic.com.au/fundraising/lookup?token=…
 * even if extras were built on localhost or a Vercel preview.
 */
export function canonicalizePartnerFacingLookupUrl(
  raw?: string | null,
  fallbackToken?: string | null
): string | undefined {
  const token = extractLookupToken(raw) || String(fallbackToken || '').trim()
  if (!token) return undefined
  return buildPartnerFacingLookupUrl(token)
}

export function healFundraisingDocumentHtml(html: string): string {
  return rewriteHtmlUnsuitableOriginsToPublicSite(html)
}

export function healFundraisingDocument<T extends Pick<FundraisingDocument, 'htmlBody'>>(doc: T): T {
  if (!doc?.htmlBody) return doc
  const htmlBody = healFundraisingDocumentHtml(doc.htmlBody)
  if (htmlBody === doc.htmlBody) return doc
  return { ...doc, htmlBody }
}
