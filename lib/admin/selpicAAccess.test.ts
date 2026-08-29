import { describe, expect, it } from 'vitest'

import {
  canSeeSelpicAQuickAction,
  canUseSelpicAAdminAccess,
  isSelpicAPayrollOnlyAdmin,
} from '@/lib/admin/selpicAAccess'

describe('selpicAAccess entry gates', () => {
  it('hides Admin Access SSO for payroll-only staff', () => {
    const payroll = {
      username: 'staff',
      role: 'admin' as const,
      permissions: ['dashboard:read', 'payroll:access'],
    }
    expect(isSelpicAPayrollOnlyAdmin(payroll)).toBe(true)
    expect(canUseSelpicAAdminAccess(payroll)).toBe(false)
    expect(canSeeSelpicAQuickAction(payroll)).toBe(true)
  })

  it('allows Admin Access for accounting managers', () => {
    const mgr = {
      username: 'acct',
      role: 'admin' as const,
      permissions: ['accounting:admin'],
    }
    expect(canUseSelpicAAdminAccess(mgr)).toBe(true)
    expect(canSeeSelpicAQuickAction(mgr)).toBe(true)
  })
})
