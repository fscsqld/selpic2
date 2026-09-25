/**
 * Safe post-login redirect for customer `/login?next=…`.
 * Relative storefront paths only — blocks open redirects and admin/API surfaces.
 */

const BLOCKED_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
  '/employee',
  '/accounting',
] as const

export function sanitizeStorefrontLoginNext(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let value = String(raw).trim()
  if (!value) return null

  try {
    value = decodeURIComponent(value)
  } catch {
    return null
  }

  value = value.trim()
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes('://')) return null
  if (value.includes('\\')) return null

  const pathOnly = value.split(/[?#]/)[0] || value
  const lower = pathOnly.toLowerCase()
  for (const prefix of BLOCKED_PREFIXES) {
    if (lower === prefix || lower.startsWith(`${prefix}/`)) return null
  }

  // Cap length to avoid oversized query abuse
  if (value.length > 512) return null

  return value
}

/** Build `/login?next=…` when returnPath is a safe storefront path. */
export function customerLoginHrefWithNext(returnPath: string | null | undefined): string {
  const next = sanitizeStorefrontLoginNext(returnPath)
  if (!next) return '/login'
  return `/login?next=${encodeURIComponent(next)}`
}

/** True when a sanitized next means “came from storefront intent” (keep customer login UX). */
export function hasStorefrontLoginNext(raw: string | null | undefined): boolean {
  return sanitizeStorefrontLoginNext(raw) != null
}
