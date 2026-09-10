/**
 * Downsize / sanitize hot-path storefront image URLs for mobile LCP + quieter console.
 * Does not change Hero look — only which URL is requested (and Unsplash dimensions).
 *
 * Cousins: indexeddb:// leftovers, sample-videos.com, http:// CMS, oversized Unsplash,
 * empty/blob/data, non-Unsplash CDN (leave dimensions alone).
 */

export type OptimizeStorefrontImageOpts = {
  /** Max Unsplash `w` (default 1080 — mobile LCP friendly; still fine full-bleed). */
  maxWidth?: number
  /** Unsplash `q` 1–100 (default 55). */
  quality?: number
}

const DEAD_HOST_RE =
  /sample-videos\.com|via\.placeholder\.com|placehold\.it|placeholder\.com\/|picsum\.photos\/id\/0\b/i

/** Unsplash photo ids that return 404 (removed upstream) — skip network to avoid console noise. */
const DEAD_UNSPLASH_PHOTO_RE = /photo-1618472043393-b31d17f5b5d7/i

/**
 * True when the browser should be allowed to request this URL.
 * False → skip to local fallback (avoids Failed to load resource console noise).
 */
export function isRequestableStorefrontMediaUrl(url: string): boolean {
  const u = (url || '').trim()
  if (!u) return false
  if (u.startsWith('indexeddb://') || u.startsWith('indexeddb:')) return false
  if (u.startsWith('javascript:') || u.startsWith('vbscript:')) return false
  if (DEAD_HOST_RE.test(u)) return false
  if (DEAD_UNSPLASH_PHOTO_RE.test(u)) return false
  if (u.startsWith('data:image/') || u.startsWith('blob:')) return true
  if (u.startsWith('/')) return true
  if (/^https?:\/\//i.test(u)) return true
  return false
}

export function optimizeStorefrontImageUrl(
  url: string,
  opts: OptimizeStorefrontImageOpts = {}
): string {
  let raw = (url || '').trim()
  if (!raw) return raw
  if (!isRequestableStorefrontMediaUrl(raw)) return ''
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  // Avoid mixed-content / CSP console noise when CMS stores http://
  if (raw.startsWith('http://')) {
    raw = `https://${raw.slice('http://'.length)}`
  }
  if (!/images\.unsplash\.com/i.test(raw)) return raw

  const maxWidth = opts.maxWidth ?? 1080
  const quality = opts.quality ?? 55

  try {
    const parsed = new URL(raw)
    const currentW = Number(parsed.searchParams.get('w') || 0)
    if (!currentW || currentW > maxWidth) {
      parsed.searchParams.set('w', String(maxWidth))
    }
    parsed.searchParams.set('q', String(Math.min(100, Math.max(1, quality))))
    parsed.searchParams.set('auto', 'format')
    if (!parsed.searchParams.get('fit')) {
      parsed.searchParams.set('fit', 'crop')
    }
    return parsed.toString()
  } catch {
    return raw
  }
}

/** Optimize when requestable; otherwise empty string (caller uses local fallback). */
export function resolveStorefrontImageSrc(
  url: string,
  opts?: OptimizeStorefrontImageOpts
): string {
  if (!isRequestableStorefrontMediaUrl(url)) return ''
  return optimizeStorefrontImageUrl(url, opts)
}
