import 'server-only'

import { createServerClient } from '@supabase/ssr'

/**
 * App Router server-only: Route Handlers, Server Actions, Server Components.
 * Do not import this module from Client Components, `pages/*.tsx`, or shared code used on the client.
 * For the browser, use `createSupabaseBrowserClient` from `@/lib/supabase/browser`.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for admin session verification.')
  }

  // Defer `next/headers` so this file is never evaluated in non-App Router server contexts during analysis.
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          /* ignore when called from a Server Component that cannot set cookies */
        }
      },
    },
  })
}
