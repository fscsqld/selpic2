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

    if (typeof window !== 'undefined') {
      const missingParts: string[] = []
      if (!url) missingParts.push('NEXT_PUBLIC_SUPABASE_URL (주소)')
      if (!anon) missingParts.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      window.alert(
        `Supabase 주소가 비어있습니다!\n\n누락: ${missingParts.join(', ')}\n\nVercel 환경 변수(NEXT_PUBLIC_*) 주입과 재배포를 확인하세요.`
      )
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
