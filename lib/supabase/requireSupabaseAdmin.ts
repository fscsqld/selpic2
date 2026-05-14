import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { evaluateAdminRegistryForSessionUser } from '@/lib/supabase/adminEmailRegistryServer'

export async function getSupabaseSessionUser(): Promise<User | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
      return null
    }
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

/** Returns the Supabase user if they are signed in, pass JWT admin checks, and pass `admin_email_registry` when enforced. */
export async function requireSupabaseAdminUser(): Promise<User | null> {
  const user = await getSupabaseSessionUser()
  if (!user?.email) return null
  const gate = await evaluateAdminRegistryForSessionUser(user)
  if (gate.rosterEnforced) {
    if (!gate.active) return null
    if (!userHasAdminAccess(user)) return null
    return user
  }
  if (!userHasAdminAccess(user)) return null
  return user
}
