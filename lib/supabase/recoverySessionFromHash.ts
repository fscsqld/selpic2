'use client'

import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const TEMP_STORAGE_KEY = 'sb-implicit-recovery-temp'

/**
 * Some Supabase recovery links land with tokens in the URL **hash** (implicit flow).
 * `createBrowserClient` from `@supabase/ssr` forces `flowType: "pkce"`, which rejects those URLs.
 * Parse the hash with a short‑lived implicit client, then copy the session into the main SSR browser client.
 */
export async function tryRecoverSessionFromImplicitHashRedirect(): Promise<
  | { ok: true }
  | { ok: false; error?: string }
> {
  if (typeof window === 'undefined') return { ok: false }

  const rawHash = window.location.hash?.replace(/^#/, '') ?? ''
  if (!rawHash) return { ok: false }

  const hp = new URLSearchParams(rawHash)
  if (hp.get('error')) {
    return {
      ok: false,
      error: hp.get('error_description')?.replace(/\+/g, ' ') || hp.get('error') || 'Authentication error',
    }
  }
  if (!hp.get('access_token')) return { ok: false }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) return { ok: false }

  const ephemeral = createClient(url, anon, {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: TEMP_STORAGE_KEY,
    },
  })

  await ephemeral.auth.getSession()
  const {
    data: { session },
    error,
  } = await ephemeral.auth.getSession()

  if (error || !session) {
    await ephemeral.auth.signOut({ scope: 'local' })
    return { ok: false, error: error?.message }
  }

  const main = createSupabaseBrowserClient()
  const { error: setErr } = await main.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  await ephemeral.auth.signOut({ scope: 'local' })

  if (setErr) {
    return { ok: false, error: setErr.message }
  }

  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, document.title, pathname + search)
  return { ok: true }
}
