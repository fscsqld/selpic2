/**
 * Downsize hot-path storefront image URLs (esp. Unsplash) for mobile LCP / payload.
 * Does not change layout or Hero design — only request dimensions/quality.
 *
 * Cousins: already-small w=, non-Unsplash CDN (leave alone), invalid URL, data:/blob:.
 */

export type OptimizeStorefrontImageOpts = {
  /** Max Unsplash `w` (default 1200 — enough for full-bleed phone/desktop DPR). */
  maxWidth?: number
  /** Unsplash `q` 1–100 (default 60). */
  quality?: number
}

export function optimizeStorefrontImageUrl(
  url: string,
  opts: OptimizeStorefrontImageOpts = {}
): string {
  let raw = (url || '').trim()
  if (!raw) return raw
  if (
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('indexeddb:')
  ) {
    return raw
  }
  // Avoid mixed-content / CSP console noise when CMS stores http://
  if (raw.startsWith('http://')) {
    raw = `https://${raw.slice('http://'.length)}`
  }
  if (!/images\.unsplash\.com/i.test(raw)) return raw

  const maxWidth = opts.maxWidth ?? 1200
  const quality = opts.quality ?? 60

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
