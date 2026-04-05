/**
 * Normalize and validate Supabase URL / anon key from env (Vercel, .env, next.config env).
 * Prevents truthy garbage like the literal string "undefined" or quoted URLs from reaching fetch().
 */

export function stripEnvQuotes(s: string | undefined | null): string {
  if (s === undefined || s === null) return ''
  let t = String(s).trim().replace(/^\uFEFF/, '')
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim()
  if (t.startsWith("'") && t.endsWith("'")) t = t.slice(1, -1).trim()
  return t.trim()
}

const INVALID_URL_LITERALS = new Set([
  '',
  'undefined',
  'null',
  'your-supabase-url',
  'https://your-project.supabase.co',
  'https://xxx.supabase.co',
])

export function isValidSupabaseHttpUrl(url: string): boolean {
  const u = stripEnvQuotes(url)
  if (!u || INVALID_URL_LITERALS.has(u.toLowerCase())) return false
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (!parsed.hostname || parsed.hostname.length < 4) return false
    return true
  } catch {
    return false
  }
}

const INVALID_KEY_LITERALS = new Set(['undefined', 'null', 'your-anon-key', 'your_anon_key'])

export function isLikelySupabaseAnonKey(key: string): boolean {
  const k = stripEnvQuotes(key)
  if (k.length < 32) return false
  if (INVALID_KEY_LITERALS.has(k.toLowerCase())) return false
  return true
}

/** Read from process.env (inlined at build for NEXT_PUBLIC_*). */
export function readRawSupabasePublicEnv(): { url: string; anon: string } {
  return {
    url: stripEnvQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: stripEnvQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}

export function hasUsableSupabaseBrowserEnv(): boolean {
  const { url, anon } = readRawSupabasePublicEnv()
  return isValidSupabaseHttpUrl(url) && isLikelySupabaseAnonKey(anon)
}
