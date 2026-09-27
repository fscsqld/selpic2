/**
 * Shop profile (userAuth) seeds vs real customers — Admin Users VIP tab.
 */

export const SHOP_PROFILE_SEED_EMAILS = new Set([
  'user@example.com',
  'info@selpic.com.au',
])

export function isShopProfileSeedEmail(email?: string | null): boolean {
  const e = (email || '').trim().toLowerCase()
  return Boolean(e && SHOP_PROFILE_SEED_EMAILS.has(e))
}

export function isShopProfileSeedUser(user: {
  email?: string | null
  isDemo?: boolean
}): boolean {
  if (user.isDemo === true) return true
  return isShopProfileSeedEmail(user.email)
}

/** Rolling window: registered in the last `days` days (not a hardcoded calendar date). */
export function isRegisteredWithinLastDays(
  createdAt: string | undefined | null,
  days: number,
  nowMs: number = Date.now()
): boolean {
  if (!createdAt || days <= 0) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t) || t > nowMs) return false
  return nowMs - t < days * 24 * 60 * 60 * 1000
}

/**
 * Phone used when matching orders to a shop profile.
 * Seed rows share historically the same Mansfield mobile — never match by phone.
 */
export function phoneForShopProfileOrderMatch(user: {
  email?: string | null
  phone?: string | null
  isDemo?: boolean
}): string | undefined {
  if (isShopProfileSeedUser(user)) return undefined
  const p = (user.phone || '').trim()
  return p || undefined
}
