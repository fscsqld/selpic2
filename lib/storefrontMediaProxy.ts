/**
 * Same-origin proxy for Supabase Storage media.
 * Some customer networks block `*.supabase.co` while `selpic.com.au` still loads —
 * rewrite public storage URLs to `/api/storefront-media?u=…` so the browser only
 * talks to our origin; the server fetches Supabase.
 *
 * Invariant: CMS/catalog keep canonical https://…supabase.co… URLs; rewrite only
 * at display / proxy-boundary. Never persist proxied URLs as the source of truth.
 */

import { readRawSupabasePublicEnv } from './supabase/publicEnv'

export const STOREFRONT_MEDIA_PROXY_PATH = '/api/storefront-media'

const PUBLIC_STORAGE_PATH = '/storage/v1/object/public/'

function configuredSupabaseHostname(): string | null {
  const { url } = readRawSupabasePublicEnv()
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase() || null
  } catch {
    return null
  }
}

/** True when this is already our proxy path (avoid double-wrapping). */
export function isStorefrontMediaProxyUrl(url: string): boolean {
  const u = (url || '').trim()
  if (!u) return false
  if (u.startsWith(`${STOREFRONT_MEDIA_PROXY_PATH}?`)) return true
  if (u.startsWith(STOREFRONT_MEDIA_PROXY_PATH + '/')) return true
  try {
    const parsed = new URL(u, 'https://selpic.com.au')
    return parsed.pathname === STOREFRONT_MEDIA_PROXY_PATH
  } catch {
    return false
  }
}

/**
 * Allowlist: https + our Supabase project host (or *.supabase.co if env missing) +
 * public object path only. Rejects private/sign paths and open-proxy targets.
 */
export function isProxiedSupabasePublicStorageUrl(url: string): boolean {
  const raw = (url || '').trim()
  if (!raw || !/^https:\/\//i.test(raw)) return false
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return false
    if (parsed.username || parsed.password) return false
    const host = parsed.hostname.toLowerCase()
    const allowed = configuredSupabaseHostname()
    if (allowed) {
      if (host !== allowed) return false
    } else if (!host.endsWith('.supabase.co')) {
      return false
    }
    if (!parsed.pathname.includes(PUBLIC_STORAGE_PATH)) return false
    // Disallow path traversal tricks in the encoded URL form.
    if (parsed.pathname.includes('..')) return false
    return true
  } catch {
    return false
  }
}

/** Extract upstream URL from a proxy href; null if not a valid proxy URL. */
export function unwrapStorefrontMediaProxyUrl(url: string): string | null {
  const raw = (url || '').trim()
  if (!raw) return null
  try {
    const parsed = raw.startsWith('http')
      ? new URL(raw)
      : new URL(raw, 'https://selpic.com.au')
    if (parsed.pathname !== STOREFRONT_MEDIA_PROXY_PATH) return null
    const upstream = (parsed.searchParams.get('u') || '').trim()
    if (!upstream) return null
    if (!isProxiedSupabasePublicStorageUrl(upstream)) return null
    return upstream
  } catch {
    return null
  }
}

/**
 * If `url` is a proxy wrapper, return the canonical Supabase URL (for catalog save).
 * Otherwise return the trimmed input unchanged.
 */
export function canonicalStorefrontMediaUrl(url: string): string {
  const raw = (url || '').trim()
  if (!raw) return ''
  return unwrapStorefrontMediaProxyUrl(raw) || raw
}

/**
 * Rewrite Supabase public storage URLs to same-origin proxy. Leaves local, data,
 * blob, Unsplash, and non-Supabase URLs unchanged.
 */
export function toSameOriginStorefrontMediaUrl(url: string): string {
  const raw = (url || '').trim()
  if (!raw) return ''
  if (isStorefrontMediaProxyUrl(raw)) return raw
  if (raw.startsWith('/') || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  if (!isProxiedSupabasePublicStorageUrl(raw)) return raw
  return `${STOREFRONT_MEDIA_PROXY_PATH}?u=${encodeURIComponent(raw)}`
}

/** Validate `?u=` for the API route — returns absolute https upstream or null. */
export function resolveUpstreamStorefrontMediaUrl(param: string | null | undefined): string | null {
  const raw = (param || '').trim()
  if (!raw) return null
  // Reject nested proxy / javascript etc.
  if (isStorefrontMediaProxyUrl(raw)) return null
  if (!isProxiedSupabasePublicStorageUrl(raw)) return null
  return raw
}
