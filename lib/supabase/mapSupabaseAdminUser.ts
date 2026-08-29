import type { User } from '@supabase/supabase-js'
import { userHasAdminAccess, userIsSuperAdmin } from '@/lib/supabase/adminClaims'
import type { AdminUser } from '@/lib/adminAuth'
import {
  DEFAULT_ADMIN_PERMISSIONS,
  SUPER_ADMIN_DEFAULT_PERMISSIONS,
} from '@/lib/adminPermissionCatalog'

/** Maps Supabase Auth user to the shape used by the admin UI (Zustand). Client-safe. */
export function mapSupabaseUserToAdminUser(user: User): AdminUser {
  const meta = user.app_metadata || {}
  const u = user.user_metadata || {}
  /**
   * Role must come from registry `role` only.
   * Do NOT treat `app_metadata.admin === true` as super_admin — every roster admin gets
   * that flag, and mis-mapping it grants full Quick Actions / permission bypass.
   */
  const role = userIsSuperAdmin(user) || meta.role === 'superadmin' ? ('super_admin' as const) : ('admin' as const)

  const permissionsFromMeta = meta.permissions
  const permissions = Array.isArray(permissionsFromMeta)
    ? (permissionsFromMeta as string[])
    : role === 'super_admin'
      ? [...SUPER_ADMIN_DEFAULT_PERMISSIONS]
      : [...DEFAULT_ADMIN_PERMISSIONS]

  const email = user.email || undefined
  const username =
    (typeof u.display_name === 'string' && u.display_name.trim()) ||
    (typeof u.username === 'string' && u.username.trim()) ||
    (typeof meta.username === 'string' && meta.username.trim()) ||
    (email ? email.split('@')[0] : user.id.slice(0, 12))

  return {
    username,
    role,
    permissions,
    isActive: true,
    createdAt: user.created_at || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    email,
  }
}

export function assertUserIsAdminForLogin(user: User): boolean {
  return userHasAdminAccess(user)
}
