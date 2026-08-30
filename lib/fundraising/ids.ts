/**
 * Human-friendly fundraising partner IDs.
 *
 * Format (new partners): `TP-{ORGSLUG}-{n}` e.g. `TP-SELPIC-7`
 * - TP = Trading Partner (avoids clash with invoice SP-*)
 * - ORGSLUG = A–Z/0–9 from organisation name (max 8)
 * - n = next integer for that slug among existing partner ids
 *
 * Existing legacy ids (`TP-SLUG-YYMMDD-XXX`) are left unchanged; only new rows use this format.
 */

/** Org name → short A–Z/0–9 slug (e.g. "selpic&co" → "SELPICCO"). */
export function slugOrgForPartnerId(organizationName: string, maxLen = 8): string {
  const cleaned = String(organizationName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
  if (cleaned.length >= 3) return cleaned.slice(0, maxLen)
  return (cleaned || 'ORG').padEnd(3, 'X').slice(0, maxLen)
}

/** `TP-SELPIC` prefix for a given organisation name. */
export function partnerIdPrefix(organizationName: string, maxLen = 8): string {
  return `TP-${slugOrgForPartnerId(organizationName, maxLen)}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highest trailing sequence for `TP-{slug}-{n}` among existing ids, then +1.
 * Ignores legacy `TP-SLUG-YYMMDD-RND` ids (they do not match).
 */
export function nextPartnerSequence(prefix: string, existingIds: string[]): number {
  const p = String(prefix || '').trim()
  if (!p) return 1
  const re = new RegExp(`^${escapeRegExp(p)}-(\\d+)$`, 'i')
  let max = 0
  for (const id of existingIds || []) {
    const m = String(id || '').trim().match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return max + 1
}

/**
 * Example: organization "SELPIC" with existing TP-SELPIC-1..6 → `TP-SELPIC-7`
 * Pass existing partner ids (from DB and/or local store) so sequences stay unique.
 */
export function newPartnerId(organizationName: string, existingIds: string[] = []): string {
  const prefix = partnerIdPrefix(organizationName)
  const seq = nextPartnerSequence(prefix, existingIds)
  return `${prefix}-${seq}`
}

/** @deprecated Kept for any date-stamp helpers; not used in new partner ids. */
export function fundraisingDateStamp(d = new Date()): string {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${yy}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

/** Documents / other fundraising rows — keep short technical ids. */
export function newFundraisingId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
