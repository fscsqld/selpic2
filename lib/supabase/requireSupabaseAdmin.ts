import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'

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

/** Returns the Supabase user if they are signed in and marked as admin in JWT metadata. */
export async function requireSupabaseAdminUser(): Promise<User | null> {
  const user = await getSupabaseSessionUser()
  if (!user || !userHasAdminAccess(user)) return null
  return user
}
