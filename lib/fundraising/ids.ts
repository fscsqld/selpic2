/**
 * Human-friendly fundraising IDs.
 *
 * Partners (new): `TP-{ORGSLUG}-{n}` e.g. `TP-SELPIC-7`
 * Outreach targets (new): `OT-{ORGSLUG}-{n}` e.g. `OT-SUNNYBAN-1`
 * - ORGSLUG = A–Z/0–9 from organisation name (max 8)
 * - n = next integer for that prefix among existing ids
 *
 * Legacy partner ids (`TP-SLUG-YYMMDD-XXX`) and legacy outreach (`fot-*`) are unchanged.
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

/** `OT-SUNNYBAN` prefix for outreach target rows (Fundraising Agent). */
export function outreachTargetIdPrefix(organizationName: string, maxLen = 8): string {
  return `OT-${slugOrgForPartnerId(organizationName, maxLen)}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highest trailing sequence for `{prefix}-{n}` among existing ids, then +1.
 * Ignores legacy ids that do not match (e.g. `TP-SLUG-YYMMDD-RND`, `fot-*`).
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

/**
 * Example: "Sunnybank Kindergarten" with OT-SUNNYBAN-1 existing → `OT-SUNNYBAN-2`
 * Pass existing outreach target ids from DB so sequences stay unique per org slug.
 */
export function newOutreachTargetId(organizationName: string, existingIds: string[] = []): string {
  const prefix = outreachTargetIdPrefix(organizationName)
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
