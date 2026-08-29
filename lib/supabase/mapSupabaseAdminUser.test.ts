import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'

import { mapSupabaseUserToAdminUser } from './mapSupabaseAdminUser'

function fakeUser(over: {
  role?: string
  admin?: boolean
  permissions?: string[]
}): User {
  return {
    id: 'u1',
    email: 'staff@example.com',
    app_metadata: {
      admin: over.admin ?? true,
      role: over.role ?? 'admin',
      permissions: over.permissions,
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  } as User
}

describe('mapSupabaseUserToAdminUser', () => {
  it('does not treat admin:true as super_admin (registry staff stay role admin)', () => {
    const mapped = mapSupabaseUserToAdminUser(
      fakeUser({ role: 'admin', admin: true, permissions: ['orders:read', 'orders:write'] })
    )
    expect(mapped.role).toBe('admin')
    expect(mapped.permissions).toEqual(['orders:read', 'orders:write'])
  })

  it('maps registry super_admin role correctly', () => {
    const mapped = mapSupabaseUserToAdminUser(
      fakeUser({ role: 'super_admin', admin: true, permissions: ['admin:manage'] })
    )
    expect(mapped.role).toBe('super_admin')
  })
})
