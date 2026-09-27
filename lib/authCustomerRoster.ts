/**
 * VIP / Shop profiles should follow Supabase Auth customers (owner roster).
 * Company admins and known test accounts are not production VIP customers.
 */

export const COMPANY_ADMIN_EMAILS = new Set([
  'jimmy@selpic.com.au',
  'info@selpic.com.au',
])

/** Dev-only fake customers — exclude from VIP summary metrics; show with Test badge until deleted. */
export const TEST_CUSTOMER_EMAILS = new Set([
  'fscsqld@gmail.com',
])

export function normalizeAuthEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase()
}

export function isCompanyAdminEmail(email?: string | null): boolean {
  const e = normalizeAuthEmail(email)
  return Boolean(e && COMPANY_ADMIN_EMAILS.has(e))
}

export function isTestCustomerEmail(email?: string | null): boolean {
  const e = normalizeAuthEmail(email)
  return Boolean(e && TEST_CUSTOMER_EMAILS.has(e))
}

export type AuthUserListRow = {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

/** Auth row eligible for Shop VIP list (not company admin by email). */
export function isAuthVipCustomerCandidate(row: AuthUserListRow): boolean {
  const email = normalizeAuthEmail(row.email)
  if (!email) return false
  if (isCompanyAdminEmail(email)) return false
  return true
}

/** Counted in Shop summary cards (excludes test/fake customers). */
export function countsTowardVipSummary(email?: string | null): boolean {
  const e = normalizeAuthEmail(email)
  if (!e) return false
  if (isCompanyAdminEmail(e)) return false
  if (isTestCustomerEmail(e)) return false
  return true
}

export function displayNameFromAuthRow(row: AuthUserListRow): string {
  const u = row.user_metadata || {}
  if (typeof u.name === 'string' && u.name.trim()) return u.name.trim()
  if (typeof u.full_name === 'string' && u.full_name.trim()) return u.full_name.trim()
  const email = normalizeAuthEmail(row.email)
  return email.split('@')[0] || 'Customer'
}
