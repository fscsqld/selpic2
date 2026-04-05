/**
 * Browser-only Supabase (anon key). Use from Client Components (`app/`), `pages/*.tsx` client code,
 * hooks, and `useEffect`. Never import this file from Route Handlers / Server Actions; use
 * `@/lib/supabase/server` there instead.
 */
import { createBrowserClient } from '@supabase/ssr'

const LOG_PREFIX = '[createSupabaseBrowserClient]'
let loggedOkOnce = false

export function createSupabaseBrowserClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const url = rawUrl?.trim() ?? ''
  const anon = rawAnon?.trim() ?? ''

  if (typeof window !== 'undefined' && !url) {
    console.error(
      '%c ERROR: URL IS MISSING ',
      'font-size: 22px; font-weight: 900; color: #fff; background: #b91c1c; padding: 10px 14px; border-radius: 6px; line-height: 2;',
      '\nNEXT_PUBLIC_SUPABASE_URL is empty in this browser bundle (Vercel: set env + redeploy so NEXT_PUBLIC_* is inlined at build).'
    )
    alert('환경변수 누락: ' + process.env.NEXT_PUBLIC_SUPABASE_URL)
  }

  if (!url || !anon) {
    const detail = {
      hasUrl: Boolean(url),
      urlLength: url.length,
      hasAnonKey: Boolean(anon),
      anonKeyLength: anon.length,
      rawUrlDefined: rawUrl !== undefined,
      rawAnonDefined: rawAnon !== undefined,
    }
    console.error(LOG_PREFIX, 'Missing Supabase env in browser bundle', detail)

    if (typeof window !== 'undefined' && url && !anon) {
      alert('환경변수 누락(anon): ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }

    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.')
  }

  if (typeof window !== 'undefined' && !loggedOkOnce) {
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

  return createBrowserClient(url, anon)
}
