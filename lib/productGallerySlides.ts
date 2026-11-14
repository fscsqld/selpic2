/**
 * PDP gallery slide ordering: catalog primary image is always slide 1 when present;
 * Media Management links are additional shots (deduped against primary by URL).
 */

import { STOREFRONT_MEDIA_PROXY_PATH } from './storefrontMediaProxy'

export function normalizeMediaCompareUrl(url: string): string {
  const t = (url || '').trim()
  if (!t) return ''
  try {
    const parsed = t.startsWith('http') ? new URL(t) : new URL(t, 'https://selpic.com.au')
    if (parsed.pathname === STOREFRONT_MEDIA_PROXY_PATH) {
      const upstream = (parsed.searchParams.get('u') || '').trim()
      if (upstream) return normalizeMediaCompareUrl(upstream)
    }
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return t.split('?')[0]?.split('#')[0] ?? t
  }
}

export function isUsablePrimaryGalleryUrl(url?: string | null): boolean {
  if (typeof url !== 'string') return false
  const t = url.trim()
  if (!t || t === 'undefined' || t.startsWith('undefined')) return false
  if (t.startsWith('indexeddb://') || t.startsWith('indexeddb:')) return false
  return true
}

/**
 * Remove linked gallery rows that are the same file as the product primary image
 * so "prepend primary" does not show the same photo twice.
 */
export function dedupeLinkedSlidesAgainstPrimary<T extends { compareUrl: string }>(
  linked: T[],
  primaryUrl?: string | null
): T[] {
  const primaryNorm = normalizeMediaCompareUrl(primaryUrl || '')
  if (!primaryNorm) return linked
  return linked.filter((row) => normalizeMediaCompareUrl(row.compareUrl) !== primaryNorm)
}

/**
 * Final PDP order: [primary?, ...linkedWithoutPrimaryDuplicate].
 * `buildPrimary` is only called when primary should lead.
 */
export function orderProductGallerySlides<T extends { compareUrl: string }>(opts: {
  primaryUrl?: string | null
  primaryAllowed?: boolean
  linked: T[]
  buildPrimary: () => T
}): T[] {
  const { primaryUrl, linked, buildPrimary } = opts
  const allowPrimary = opts.primaryAllowed !== false && isUsablePrimaryGalleryUrl(primaryUrl)
  const deduped = dedupeLinkedSlidesAgainstPrimary(linked, allowPrimary ? primaryUrl : null)
  if (!allowPrimary) return deduped
  return [buildPrimary(), ...deduped]
}

export type GalleryMediaRow = {
  id?: string
  order?: number
  url?: string
  webpUrl?: string
  [key: string]: unknown
}

function sortByGalleryOrder<T extends { order?: number }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Merge local admin media-store rows with `/api/media/public` for one PDP.
 *
 * Invariant: a browser that once opened Admin (`media-store` in localStorage) must
 * still show server-linked gallery shots when local has no rows for this product
 * (incognito/mobile already did — normal laptop Admin tabs must match).
 *
 * - Local rows for this SKU → prefer local (admin edit / pending upload), refresh URLs from remote by id.
 * - Local empty + remote loaded → use remote (customer parity).
 * - Remote not loaded yet → keep local (may be empty) to avoid flicker.
 */
export function mergeProductGalleryMediaSources<T extends GalleryMediaRow>(opts: {
  hasClientMediaStore: boolean
  local: T[]
  remote: T[]
  remoteLoaded: boolean
}): T[] {
  const local = Array.isArray(opts.local) ? opts.local : []
  const remote = Array.isArray(opts.remote) ? opts.remote : []

  if (opts.hasClientMediaStore) {
    if (local.length > 0) {
      const remoteById = new Map(
        remote.filter((f) => f?.id).map((f) => [String(f.id), f] as const)
      )
      return sortByGalleryOrder(
        local.map((f) => {
          const r = f.id ? remoteById.get(String(f.id)) : undefined
          return (r ? { ...r, ...f } : f) as T
        })
      )
    }
    if (!opts.remoteLoaded) return local
    return sortByGalleryOrder(remote)
  }

  if (!opts.remoteLoaded) return local

  if (local.length > 0) {
    const remoteById = new Map(
      remote.filter((f) => f?.id).map((f) => [String(f.id), f] as const)
    )
    return sortByGalleryOrder(
      local.map((f) => {
        const r = f.id ? remoteById.get(String(f.id)) : undefined
        return (r ? { ...r, ...f } : f) as T
      })
    )
  }

  return sortByGalleryOrder(remote)
}
