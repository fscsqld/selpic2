/**
 * Pure product imagery heuristics for Performance site-upgrade (HITL).
 * Never mutates catalog; never invents new storefront images.
 *
 * Cousins: OOS SKUs, indexeddb:// / data: URLs that look set locally but fail on www,
 * placeholder hosts, empty image with rich fallback only, gallery-only assets in media-store
 * (catalog image still empty → still weak until product.image is set).
 */

export type WeakImagerySample = {
  id?: string
  name: string
  reason: string
}

export type WeakProductImagerySummary = {
  count: number
  sampleName?: string
  sampleNames: string[]
  samples: WeakImagerySample[]
}

type ImageryProductLike = {
  id?: string
  name?: string
  image?: string
  fallbackImage?: string
  inStock?: boolean
}

const MAX_SAMPLES = 5

function looksUnusableUrl(raw: string): boolean {
  const u = raw.trim().toLowerCase()
  if (!u) return true
  if (u.startsWith('indexeddb://')) return true
  if (u.startsWith('data:')) return true
  if (u.includes('via.placeholder')) return true
  if (u.includes('placeholder.com')) return true
  if (u.includes('/placeholder')) return true
  return false
}

/** True when a live listing likely needs stronger primary imagery. */
export function isWeakProductImagery(p: ImageryProductLike): boolean {
  if (p.inStock === false) return false
  const primary = (p.image || '').trim()
  const fallback = (p.fallbackImage || '').trim()
  if (!primary) {
    // Fallback alone is not a storefront primary image for most cards.
    return true
  }
  if (looksUnusableUrl(primary)) return true
  if (fallback && looksUnusableUrl(fallback) && looksUnusableUrl(primary)) return true
  return false
}

export function weakImageryReason(p: ImageryProductLike): string {
  const primary = (p.image || '').trim()
  if (!primary) return 'missing primary image'
  if (primary.toLowerCase().startsWith('indexeddb://')) return 'browser-only indexeddb URL'
  if (primary.toLowerCase().startsWith('data:')) return 'inline data URL (not synced)'
  if (looksUnusableUrl(primary)) return 'placeholder / unusable URL'
  return 'needs review'
}

export function summarizeWeakProductImagery(
  products: ImageryProductLike[]
): WeakProductImagerySummary {
  const weak = products.filter(isWeakProductImagery)
  const samples = weak
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id.trim() : undefined,
      name: (p.name || '').trim(),
      reason: weakImageryReason(p),
    }))
    .filter((p) => p.name)
    .slice(0, MAX_SAMPLES)
  const sampleNames = samples.map((s) => s.name)
  return {
    count: weak.length,
    sampleName: sampleNames[0],
    sampleNames,
    samples,
  }
}
