import { describe, expect, it } from 'vitest'

import type { AdminUser } from '@/lib/adminAuth'
import {
  adminHasAllPermissions,
  adminHasFullAccess,
  adminHasPermission,
} from '@/lib/adminPermissionCheck'

function admin(over: Partial<AdminUser> = {}): AdminUser {
  return {
    username: 'test',
    role: 'admin',
    permissions: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('adminPermissionCheck', () => {
  it('grants full access for super_admin and admin:manage', () => {
    expect(adminHasFullAccess(admin({ role: 'super_admin' }))).toBe(true)
    expect(adminHasFullAccess(admin({ permissions: ['admin:manage'] }))).toBe(true)
    expect(adminHasFullAccess(admin({ permissions: ['dashboard:read'] }))).toBe(false)
  })

  it('accepts direct permission matches', () => {
    expect(adminHasPermission(admin({ permissions: ['orders:read'] }), 'orders:read')).toBe(true)
    expect(adminHasPermission(admin({ permissions: ['orders:read'] }), 'orders:write')).toBe(false)
  })

  it('treats write as implying read', () => {
    expect(adminHasPermission(admin({ permissions: ['products:write'] }), 'products:read')).toBe(true)
  })

  it('honours legacy aliases for traffic and fundraising', () => {
    expect(adminHasPermission(admin({ permissions: ['analytics:read'] }), 'traffic:read')).toBe(true)
    expect(adminHasPermission(admin({ permissions: ['analytics:read'] }), 'fundraising:read')).toBe(true)
  })

  it('honours legacy aliases for accounting and payroll', () => {
    expect(adminHasPermission(admin({ permissions: ['system:admin'] }), 'accounting:read')).toBe(true)
    expect(adminHasPermission(admin({ permissions: ['accounting:full'] }), 'accounting:admin')).toBe(true)
    expect(adminHasPermission(admin({ permissions: ['payroll:read'] }), 'payroll:access')).toBe(true)
  })

  it('requires every permission in adminHasAllPermissions', () => {
    const user = admin({ permissions: ['orders:read', 'products:read'] })
    expect(adminHasAllPermissions(user, ['orders:read', 'products:read'])).toBe(true)
    expect(adminHasAllPermissions(user, ['orders:read', 'orders:write'])).toBe(false)
  })
})
