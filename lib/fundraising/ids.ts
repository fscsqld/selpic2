/**
 * Human-friendly fundraising IDs.
 * Partner IDs stay unique but short enough for admin email / support.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** YYMMDD in local time (admin-friendly join date). */
export function fundraisingDateStamp(d = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2)
  return `${yy}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

/** Org name → short A–Z/0–9 slug (e.g. "selpic&co" → "SELPICCO"). */
export function slugOrgForPartnerId(organizationName: string, maxLen = 8): string {
  const cleaned = String(organizationName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
  if (cleaned.length >= 3) return cleaned.slice(0, maxLen)
  return (cleaned || 'ORG').padEnd(3, 'X').slice(0, maxLen)
}

/** 3-char base36 suffix to reduce same-day collisions. */
function shortSuffix(): string {
  return Math.random().toString(36).slice(2, 5).toUpperCase().padEnd(3, '0')
}

/**
 * Example: organization "selpic&co" on 2026-08-03 → `TP-SELPICCO-260803-A3K`
 * Prefix TP (Trading Partner) — avoids clash with invoice refs (SP-*).
 * (Much shorter than `fp-1785738594801-neeq70x`.)
 */
export function newPartnerId(organizationName: string, d = new Date()): string {
  const slug = slugOrgForPartnerId(organizationName)
  const day = fundraisingDateStamp(d)
  return `TP-${slug}-${day}-${shortSuffix()}`
}

/** Documents / other fundraising rows — keep short technical ids. */
export function newFundraisingId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
