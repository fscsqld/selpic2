/**
 * Single source of truth for storefront admin permission strings.
 * Keep in sync with lib/permissionUtils.ts descriptions and AdminRoute guards.
 */

export const ADMIN_PERMISSION_CATALOG = [
  'dashboard:read',
  'products:read',
  'products:write',
  'content:read',
  'content:write',
  'users:read',
  'users:write',
  'analytics:read',
  'orders:read',
  'orders:write',
  'messages:read',
  'messages:write',
  'community:read',
  'community:write',
  'community:moderate',
  'images:read',
  'images:write',
  'invoices:read',
  'invoices:write',
  'traffic:read',
  'integrations:read',
  'integrations:write',
  'documents:read',
  'documents:write',
  'newsletter:read',
  'newsletter:write',
  'bespoke:read',
  'bespoke:write',
  'fundraising:read',
  'fundraising:write',
  'fundraising:finance',
  'accounting:read',
  'accounting:admin',
  'payroll:access',
  'system:admin',
  'admin:manage',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSION_CATALOG)[number]

/** Stronger permissions that imply weaker ones (e.g. write → read). */
export const ADMIN_PERMISSION_IMPLIES: Partial<Record<AdminPermission, AdminPermission[]>> = {
  'products:write': ['products:read'],
  'content:write': ['content:read'],
  'users:write': ['users:read'],
  'orders:write': ['orders:read'],
  'messages:write': ['messages:read'],
  'community:write': ['community:read'],
  'community:moderate': ['community:read'],
  'images:write': ['images:read'],
  'invoices:write': ['invoices:read'],
  'integrations:write': ['integrations:read'],
  'documents:write': ['documents:read'],
  'newsletter:write': ['newsletter:read'],
  'bespoke:write': ['bespoke:read'],
  'fundraising:write': ['fundraising:read'],
  'fundraising:finance': ['fundraising:read'],
  'accounting:admin': ['accounting:read'],
}

/**
 * Legacy assignments still in production registries — treated as satisfying the new permission.
 * Remove entries only after migrating all admin_email_registry rows.
 */
export const ADMIN_PERMISSION_LEGACY_ALIASES: Partial<Record<AdminPermission, AdminPermission[]>> = {
  'traffic:read': ['analytics:read'],
  'fundraising:read': ['analytics:read'],
  'fundraising:write': ['analytics:read'],
  'fundraising:finance': ['analytics:read'],
  'integrations:read': ['orders:read'],
  'integrations:write': ['orders:write'],
  'documents:read': ['users:read'],
  'documents:write': ['users:write'],
  'newsletter:read': ['users:read'],
  'newsletter:write': ['users:write'],
  'bespoke:read': ['messages:read'],
  'bespoke:write': ['messages:write'],
  'accounting:read': ['accounting:admin', 'system:admin'],
  'accounting:admin': ['system:admin', 'accounting:full'],
  'payroll:access': ['payroll:read'],
}

export const SUPER_ADMIN_DEFAULT_PERMISSIONS: AdminPermission[] = [...ADMIN_PERMISSION_CATALOG]

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [
  'dashboard:read',
  'products:read',
  'products:write',
  'content:read',
  'content:write',
  'users:read',
  'analytics:read',
  'orders:read',
  'messages:read',
  'community:read',
  'images:read',
  'images:write',
  'invoices:read',
  'invoices:write',
  'traffic:read',
  'integrations:read',
  'documents:read',
  'newsletter:read',
  'bespoke:read',
  'fundraising:read',
  'system:admin',
]
