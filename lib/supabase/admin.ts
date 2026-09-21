import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseNoSessionClientOptions } from '@/lib/supabase/adminFetch'

let singleton: SupabaseClient | null = null

/** Server-only: uses service role key; never import this in client components. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).')
  }
  if (!singleton) {
    singleton = createClient(url, key, supabaseNoSessionClientOptions())
  }
  return singleton
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return Boolean(url && key)
}
