'use client'

import type { SupabaseClient, User } from '@supabase/supabase-js'

import { useAdminAuth } from '@/lib/adminAuth'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { mapSupabaseUserToAdminUser } from '@/lib/supabase/mapSupabaseAdminUser'
import { syncAdminRegistryWithSession } from '@/lib/supabase/syncAdminRegistryClient'
import { hasUsableSupabaseBrowserEnv } from '@/lib/supabase/publicEnv'

export type ResolvedAdminBrowserSession =
  | { ok: true; user: User; hydrated: boolean }
  | { ok: false; reason: 'no_supabase_env' | 'no_session' | 'not_admin' | 'registry_denied' | 'error' }

/**
 * Single client gate: Supabase cookie session + registry access + Zustand adminUser stay aligned.
 * Prevents "Staff dashboard" / login page redirect loops when persist says logged-in but cookies do not.
 */
export async function resolveAdminBrowserSession(
  supabase: SupabaseClient
): Promise<ResolvedAdminBrowserSession> {
  if (!hasUsableSupabaseBrowserEnv()) {
    return useAdminAuth.getState().isLoggedIn
      ? { ok: true, user: {} as User, hydrated: false }
      : { ok: false, reason: 'no_supabase_env' }
  }

  try {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session?.user) {
      if (useAdminAuth.getState().isLoggedIn) {
        useAdminAuth.getState().logout()
      }
      return { ok: false, reason: 'no_session' }
    }

    if (!userHasAdminAccess(session.user)) {
      if (useAdminAuth.getState().isLoggedIn) {
        useAdminAuth.getState().logout()
      }
      return { ok: false, reason: 'not_admin' }
    }

    await syncAdminRegistryWithSession(supabase, session.access_token)
    const { data: after } = await supabase.auth.getSession()
    const live = after.session ?? session
    if (!live?.user || !userHasAdminAccess(live.user)) {
      await supabase.auth.signOut().catch(() => {})
      useAdminAuth.getState().logout()
      return { ok: false, reason: 'not_admin' }
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const accessRes = await fetch(`${origin}/api/admin/registry-access`, { credentials: 'same-origin' })
    if (!accessRes.ok) {
      await supabase.auth.signOut().catch(() => {})
      useAdminAuth.getState().logout()
      return { ok: false, reason: 'registry_denied' }
    }

    const mapped = mapSupabaseUserToAdminUser(live.user)
    useAdminAuth.setState({ isLoggedIn: true, adminUser: mapped })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin-auth-updated'))
    }

    return { ok: true, user: live.user, hydrated: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
