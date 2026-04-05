'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

/** Applies DB registry to JWT, then refreshes the local session. */
export async function syncAdminRegistryWithSession(
  supabase: SupabaseClient,
  accessToken: string
): Promise<{ ok: boolean }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await fetch(`${origin}/api/admin/sync-admin-registry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return { ok: false }
    await supabase.auth.refreshSession()
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
