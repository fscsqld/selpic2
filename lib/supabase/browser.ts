/**
 * Browser-only Supabase (anon key). Use from Client Components (`app/`), `pages/*.tsx` client code,
 * hooks, and `useEffect`. Never import this file from Route Handlers / Server Actions; use
 * `@/lib/supabase/server` there instead.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.')
  }
  return createBrowserClient(url, anon)
}
