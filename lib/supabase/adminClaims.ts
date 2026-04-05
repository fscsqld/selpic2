import type { User } from '@supabase/supabase-js'

/**
 * Pure helpers — safe in Client Components, Pages router, and App router.
 * (No next/headers or Node-only APIs.)
 */
export function userHasAdminAccess(user: User): boolean {
  const m = user.app_metadata || {}
  const u = user.user_metadata || {}
  return (
    m.admin === true ||
    m.role === 'admin' ||
    m.role === 'super_admin' ||
    u.admin === true ||
    u.role === 'admin' ||
    u.role === 'super_admin' ||
    u.is_admin === true
  )
}
