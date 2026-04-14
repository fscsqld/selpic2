/**
 * Browser-only Supabase (anon key). Use from Client Components (`app/`), `pages/*.tsx` client code,
 * hooks, and `useEffect`. Never import this file from Route Handlers / Server Actions; use
 * `@/lib/supabase/server` there instead.
 */
import { createBrowserClient } from '@supabase/ssr'
import {
  isLikelySupabaseAnonKey,
  isValidSupabaseHttpUrl,
  readRawSupabasePublicEnv,
} from '@/lib/supabase/publicEnv'

const LOG_PREFIX = '[createSupabaseBrowserClient]'
let loggedOkOnce = false

function readValidatedSupabasePublicEnv(): { url: string; anon: string } {
  const { url, anon } = readRawSupabasePublicEnv()

  const urlOk = isValidSupabaseHttpUrl(url)
  const anonOk = isLikelySupabaseAnonKey(anon)

  if (typeof window !== 'undefined' && !urlOk) {
    console.error(
      '%c ERROR: URL IS MISSING OR INVALID ',
      'font-size: 22px; font-weight: 900; color: #fff; background: #b91c1c; padding: 10px 14px; border-radius: 6px; line-height: 2;',
      '\nNEXT_PUBLIC_SUPABASE_URL must be a full https URL (e.g. https://xxxx.supabase.co).',
      '\nVercel: set for Preview + Production, no extra quotes; redeploy after changing env.'
    )
    alert('환경변수 누락: ' + process.env.NEXT_PUBLIC_SUPABASE_URL)
  }

  if (!urlOk || !anonOk) {
    const detail = {
      urlOk,
      anonOk,
      urlLength: url.length,
      anonLength: anon.length,
      urlPreview: url ? `${url.slice(0, 24)}…` : '(empty)',
    }
    console.error(LOG_PREFIX, 'Invalid Supabase public env (would break fetch())', detail)

    if (typeof window !== 'undefined' && urlOk && !anonOk) {
      alert('환경변수 누락(anon): ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }

    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be valid (see Vercel env + Preview scope).'
    )
  }

  return { url, anon }
}

function logClientOriginOnce(url: string, anon: string) {
  if (typeof window === 'undefined' || loggedOkOnce) return
  loggedOkOnce = true
  try {
    const origin = new URL(url).origin
    console.info(
      LOG_PREFIX,
      'OK — client will use',
      origin,
      '| anon key prefix:',
      `${anon.slice(0, 8)}…`
    )
  } catch {
    console.warn(LOG_PREFIX, 'OK — URL set but not parseable as URL:', url.slice(0, 48))
  }
}

/** Default browser fetch (HTTP cache behavior follows the browser). */
export function createSupabaseBrowserClient() {
  const { url, anon } = readValidatedSupabasePublicEnv()
  logClientOriginOnce(url, anon)
  return createBrowserClient(url, anon)
}

/**
 * Same URL and anon key as {@link createSupabaseBrowserClient}; passes `cache: 'no-store'` on every
 * request so PostgREST responses are not served from the HTTP cache (avoids stale `site_configs` on
 * local vs deployed after CMS updates).
 */
export function createSupabaseBrowserClientNoStore() {
  const { url, anon } = readValidatedSupabasePublicEnv()
  logClientOriginOnce(url, anon)
  const fetchNoStore: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      cache: 'no-store',
    })
  return createBrowserClient(url, anon, {
    global: { fetch: fetchNoStore },
  })
}
