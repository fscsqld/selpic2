/**
 * Storefront → Selpic A (accounting app) entry helpers.
 * Use NEXT_PUBLIC_ACCOUNTING_URL in production; falls back to local :3001 in dev.
 */

import { adminHasPermission } from '@/lib/adminPermissionCheck'

export type SelpicAAdminUser = {
  username?: string
  role?: string
  permissions?: string[]
} | null

export function getAccountingAppBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_ACCOUNTING_URL || 'http://localhost:3001').trim()
  return raw.replace(/\/$/, '')
}

export function isSelpicAAccountingManager(admin: SelpicAAdminUser): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  const perms = admin.permissions || []
  return perms.includes('accounting:admin') || perms.includes('accounting:full')
}

export function isSelpicAPayrollOnlyAdmin(admin: SelpicAAdminUser): boolean {
  if (!admin || isSelpicAAccountingManager(admin)) return false
  const perms = admin.permissions || []
  return perms.includes('payroll:read') || perms.includes('payroll:access')
}

/**
 * Admin Access (SSO) → full accounting workspace only.
 * Payroll-only staff must use Staff Access (employee login), not admin SSO.
 */
export function canUseSelpicAAdminAccess(admin: SelpicAAdminUser): boolean {
  return isSelpicAAccountingManager(admin)
}

export function canSeeSelpicAQuickAction(admin: SelpicAAdminUser): boolean {
  if (!admin) return false
  if (canUseSelpicAAdminAccess(admin)) return true
  if (isSelpicAPayrollOnlyAdmin(admin)) return true
  return adminHasPermission(admin, 'accounting:read')
}

export function buildSelpicAAdminSsoUrl(admin: NonNullable<SelpicAAdminUser>): string {
  const token = btoa(
    JSON.stringify({
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions || [],
      timestamp: Date.now(),
      accessType: 'admin',
    })
  )
  return `${getAccountingAppBaseUrl()}?token=${encodeURIComponent(token)}`
}

export function buildSelpicAStaffLoginUrl(): string {
  return `${getAccountingAppBaseUrl()}/employee/login`
}
