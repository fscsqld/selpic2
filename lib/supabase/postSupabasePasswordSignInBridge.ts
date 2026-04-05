'use client'

import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { assertUserIsAdminForLogin, mapSupabaseUserToAdminUser } from '@/lib/supabase/mapSupabaseAdminUser'
import { syncAdminRegistryWithSession } from '@/lib/supabase/syncAdminRegistryClient'
import { useAdminAuth } from '@/lib/adminAuth'

export type PostSignInBridgeResult =
  | { outcome: 'admin' }
  | { outcome: 'customer'; user: User }
  | { outcome: 'not_admin_gate'; error: string }
  | { outcome: 'roster_blocked'; error: string }

/**
 * Single Supabase Auth session for staff and customers. After password sign-in:
 * syncs admin email registry into the JWT, refreshes the session, then routes by role.
 *
 * - **admin_portal** (`/admin/login`): only accounts with admin claims may proceed; others are signed out.
 * - **storefront** (`/login`): customers continue shopping; staff get admin UI hydrated and callers redirect to the dashboard.
 */
export async function postSupabasePasswordSignInBridge(
  supabase: SupabaseClient,
  session: Session,
  mode: 'admin_portal' | 'storefront'
): Promise<PostSignInBridgeResult> {
  await syncAdminRegistryWithSession(supabase, session.access_token)
  const { data: after } = await supabase.auth.getSession()
  const s = after.session ?? session
  const signedInUser = s.user
  const accessToken = s.access_token

  const isAdmin = assertUserIsAdminForLogin(signedInUser)

  if (!isAdmin) {
    if (mode === 'admin_portal') {
      await supabase.auth.signOut()
      return { outcome: 'not_admin_gate', error: 'This account is not authorized for admin access.' }
    }
    return { outcome: 'customer', user: signedInUser }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  try {
    const rosterRes = await fetch(`${origin}/api/admin/me-on-registry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const roster = (await rosterRes.json().catch(() => ({}))) as {
      rosterEnforced?: boolean
      onRoster?: boolean
      active?: boolean
    }
    if (
      rosterRes.ok &&
      roster.rosterEnforced === true &&
      (!roster.onRoster || !roster.active)
    ) {
      await supabase.auth.signOut()
      return {
        outcome: 'roster_blocked',
        error:
          'This email is not on the active admin roster. Add it under Admin Management (by email) first.',
      }
    }
  } catch {
    /* roster API failure does not block login */
  }

  const mapped = mapSupabaseUserToAdminUser(signedInUser)
  useAdminAuth.setState({
    isLoggedIn: true,
    adminUser: mapped,
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('admin-auth-updated'))
    const { useAdminSession } = await import('@/lib/adminSession')
    const { useAdminActivityLog } = await import('@/lib/adminActivityLog')
    const { createSession } = useAdminSession.getState()
    const { getUserAgent, getClientIP, addLog } = useAdminActivityLog.getState()
    const clientIP = await getClientIP()
    createSession(mapped.username, mapped.role, clientIP, getUserAgent())
    addLog({
      action: 'login',
      performedBy: mapped.username,
      ipAddress: clientIP,
      userAgent: getUserAgent(),
    })
  }

  return { outcome: 'admin' }
}
