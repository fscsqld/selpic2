import type { AdminUser } from '@/lib/adminAuth'
import {
  ADMIN_PERMISSION_IMPLIES,
  ADMIN_PERMISSION_LEGACY_ALIASES,
  type AdminPermission,
} from '@/lib/adminPermissionCatalog'

export type AdminLike = Pick<AdminUser, 'role' | 'permissions'> | null | undefined

/** Full app bypass — registry super_admin or explicit admin:manage (admin account ops). */
export function adminHasFullAccess(admin: AdminLike): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  return (admin.permissions || []).includes('admin:manage')
}

function expandsAccepted(required: string, accepted: Set<string>) {
  accepted.add(required)
  for (const legacy of ADMIN_PERMISSION_LEGACY_ALIASES[required as AdminPermission] || []) {
    accepted.add(legacy)
  }
  for (const [strong, weakList] of Object.entries(ADMIN_PERMISSION_IMPLIES)) {
    if (weakList?.includes(required as AdminPermission)) {
      accepted.add(strong)
    }
  }
}

/** True if admin holds `required` directly, via legacy alias, or via a stronger implied permission. */
export function adminHasPermission(admin: AdminLike, required: string): boolean {
  if (!admin) return false
  if (adminHasFullAccess(admin)) return true

  const perms = admin.permissions || []
  if (perms.includes(required)) return true

  const accepted = new Set<string>()
  expandsAccepted(required, accepted)
  return perms.some((p) => accepted.has(p))
}

export function adminHasAllPermissions(admin: AdminLike, required: string[]): boolean {
  if (!required.length) return true
  return required.every((p) => adminHasPermission(admin, p))
}

/** True if admin holds at least one of the listed permissions. */
export function adminHasAnyPermission(admin: AdminLike, required: string[]): boolean {
  if (!required.length) return false
  return required.some((p) => adminHasPermission(admin, p))
}

/** System Management — super_admin or explicit `system:admin` (not admin:manage bypass). */
export function adminHasSystemAdminAccess(admin: AdminLike): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  return (admin.permissions || []).includes('system:admin')
}

/** Admin Settings (personal) — password, profile, notifications, UI prefs. */
export function adminHasSettingsPersonalAccess(admin: AdminLike): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  const perms = admin.permissions || []
  return perms.includes('settings:personal') || perms.includes('system:admin')
}

/** Admin Settings page entry (dashboard tile + /admin/settings route). */
export function adminHasAdminSettingsPageAccess(admin: AdminLike): boolean {
  return adminHasSettingsPersonalAccess(admin)
}

/**
 * Dashboard / nav display: explicit grants + write→read only.
 * Does not apply legacy aliases (e.g. users:read must not unlock documents:read tile).
 */
export function adminHasPermissionStrict(admin: AdminLike, required: string): boolean {
  if (!admin) return false
  if (adminHasFullAccess(admin)) return true

  const perms = admin.permissions || []
  if (perms.includes(required)) return true

  for (const [strong, weakList] of Object.entries(ADMIN_PERMISSION_IMPLIES)) {
    if (weakList?.includes(required as AdminPermission) && perms.includes(strong)) {
      return true
    }
  }
  return false
}
