const VISITOR_KEY = 'selpic_vid'
const DEDUPE_PREFIX = 'selpic_pv_dedupe:'

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(VISITOR_KEY)
    if (id && /^[a-zA-Z0-9_-]{8,64}$/.test(id)) return id
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
    window.localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return ''
  }
}

/** True only on production storefront host (excludes localhost and *.vercel.app previews). */
export function shouldTrackStorefrontTraffic(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
  if (host.endsWith('.vercel.app')) return false
  return host === 'selpic.com.au' || host === 'www.selpic.com.au'
}

export function isStorefrontPath(pathname: string): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/api')) return false
  if (pathname.startsWith('/_next')) return false
  return true
}

/** Avoid flooding the same path within a short window (same tab). */
export function shouldSendPageviewForPath(pathname: string, windowMs = 30_000): boolean {
  if (typeof window === 'undefined') return false
  try {
    const key = `${DEDUPE_PREFIX}${pathname}`
    const raw = window.sessionStorage.getItem(key)
    const now = Date.now()
    if (raw) {
      const prev = Number(raw)
      if (Number.isFinite(prev) && now - prev < windowMs) return false
    }
    window.sessionStorage.setItem(key, String(now))
    return true
  } catch {
    return true
  }
}
