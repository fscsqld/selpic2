import type { MediaFile } from '@/lib/mediaStore'
import {
  getSuppressedMediaIds,
  getSuppressedMediaUrls,
  hasClientMediaStore,
  isSuppressedMediaUrl,
} from '@/lib/mediaDeleteTombstone'

export function normalizeProductId(id: unknown): string {
  if (id == null) return ''
  return String(id).trim()
}

export function productIdsMatch(a: unknown, b: unknown): boolean {
  const x = normalizeProductId(a)
  const y = normalizeProductId(b)
  if (!x || !y) return false
  return x === y
}

/** Read persisted media-store (same shape as Zustand persist). */
export function readAllMediaFromLocalStorage(): MediaFile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('media-store')
    if (!raw) return []
    const parsed = JSON.parse(raw) as {
      state?: { mediaFiles?: MediaFile[] }
      mediaFiles?: MediaFile[]
    }
    const stored = parsed?.state?.mediaFiles ?? parsed?.mediaFiles
    if (!Array.isArray(stored)) return []
    return stored.map((file) => ({
      ...file,
      uploadedAt:
        typeof file.uploadedAt === 'string' ? new Date(file.uploadedAt) : file.uploadedAt,
    }))
  } catch {
    return []
  }
}

function isRowVisible(file: MediaFile): boolean {
  if (!file?.id) return false
  if (getSuppressedMediaIds().has(String(file.id))) return false
  for (const u of [file.url, file.webpUrl, file.thumbnailUrl]) {
    if (typeof u === 'string' && isSuppressedMediaUrl(u)) return false
  }
  return true
}

/** Authoritative gallery membership for local admin/dev (flush runs before persist catches up). */
export function readProductGalleryMediaFromLocalStorage(productId: string): MediaFile[] {
  const pid = normalizeProductId(productId)
  if (!pid) return []
  return readAllMediaFromLocalStorage()
    .filter(
      (f) =>
        f.productId != null &&
        productIdsMatch(f.productId, pid) &&
        (f.type === 'image' || f.type === 'video') &&
        isRowVisible(f)
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function countProductGalleryMediaInLocalStorage(productId: string): number {
  return readProductGalleryMediaFromLocalStorage(productId).length
}

/** Align in-memory Zustand with flushed localStorage (prevents rehydrate resurrecting deletes). */
export function hydrateMediaStoreFromLocalStorage(): void {
  if (typeof window === 'undefined' || !hasClientMediaStore()) return
  const fromLs = readAllMediaFromLocalStorage()
  void import('@/lib/mediaStore').then(({ useMediaStore }) => {
    const current = useMediaStore.getState().mediaFiles
    const sig = (list: MediaFile[]) =>
      list
        .map((f) => f.id)
        .sort()
        .join('|')
    if (sig(current) !== sig(fromLs)) {
      useMediaStore.setState({ mediaFiles: fromLs })
    }
  })
}

export function resolveStorefrontFallbackImage(
  productId: string,
  fallbackImage?: string,
  productImage?: string
): string {
  const candidates = [fallbackImage, productImage].filter(
    (u): u is string => typeof u === 'string' && u.trim() !== ''
  )
  for (const url of candidates) {
    if (isSuppressedMediaUrl(url)) continue
    if (hasClientMediaStore() && countProductGalleryMediaInLocalStorage(productId) === 0) {
      const tombstoneUrls = getSuppressedMediaUrls()
      if (tombstoneUrls.has(url.trim())) continue
    }
    return url
  }
  return ''
}
