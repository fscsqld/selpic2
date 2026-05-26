import type { MediaFile } from '@/lib/mediaStore'
import { countProductGalleryMediaInLocalStorage } from '@/lib/mediaGalleryLocal'

function normalizeComparableUrl(url: string): string {
  const t = url.trim()
  if (!t) return ''
  try {
    const u = new URL(t)
    return `${u.origin}${u.pathname}`
  } catch {
    return t.split('?')[0]?.split('#')[0] ?? t
  }
}

function productUrlMatchesDeletedSet(productUrl: string, urls: Set<string>): boolean {
  const t = productUrl.trim()
  if (!t) return false
  if (urls.has(t)) return true
  const norm = normalizeComparableUrl(t)
  return norm.length > 0 && urls.has(norm)
}

function collectPublicUrls(file: MediaFile): string[] {
  const out: string[] = []
  for (const u of [file.url, file.webpUrl, file.thumbnailUrl, file.fallbackImageUrl]) {
    if (typeof u !== 'string') continue
    const t = u.trim()
    if (!t || t.startsWith('data:') || t.startsWith('indexeddb://') || t.startsWith('blob:')) continue
    out.push(t)
  }
  return out
}

/** URLs tied to media rows being removed (storefront product.image may still reference them). */
export function urlsForMediaIds(files: MediaFile[], ids: string[]): Set<string> {
  const idSet = new Set(ids)
  const urls = new Set<string>()
  for (const f of files) {
    if (!idSet.has(f.id)) continue
    for (const u of collectPublicUrls(f)) urls.add(u)
  }
  return urls
}

/** Write in-memory media list to localStorage immediately (persist is async; stale reads resurrect deletes). */
export function flushMediaStoreToLocalStorage(files: MediaFile[]): void {
  if (typeof window === 'undefined') return
  try {
    const serialized = files.map((file) => {
      const uploadedAt =
        typeof file.uploadedAt === 'string' ? file.uploadedAt : file.uploadedAt.toISOString()
      const { dataUrl: _d, ...rest } = { ...file, uploadedAt }
      return rest
    })
    const raw = localStorage.getItem('media-store')
    let wrapper: Record<string, unknown> = {}
    if (raw) {
      try {
        wrapper = JSON.parse(raw) as Record<string, unknown>
      } catch {
        wrapper = {}
      }
    }
    if (wrapper.state && typeof wrapper.state === 'object') {
      wrapper = {
        ...wrapper,
        state: { ...(wrapper.state as object), mediaFiles: serialized },
      }
    } else {
      wrapper = { state: { mediaFiles: serialized }, version: wrapper.version ?? 0 }
    }
    localStorage.setItem('media-store', JSON.stringify(wrapper))
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'media-store',
        newValue: localStorage.getItem('media-store'),
        storageArea: localStorage,
      })
    )
  } catch (e) {
    console.warn('[mediaDeleteSideEffects] flushMediaStoreToLocalStorage failed:', e)
  }
}

/** When a product has no gallery media left, clear primary image so detail fallback does not show deleted assets. */
export async function clearProductPrimaryWhenNoGalleryMedia(productIds: string[]): Promise<void> {
  if (!productIds.length || typeof window === 'undefined') return
  const { useStore } = await import('@/lib/store')
  const { products, updateProduct } = useStore.getState()
  let changed = false
  for (const pid of productIds) {
    const id = String(pid).trim()
    if (!id) continue
    if (countProductGalleryMediaInLocalStorage(id) > 0) continue
    const p = products.find((x) => String(x.id) === id)
    if (!p) continue
    const img = typeof p.image === 'string' ? p.image.trim() : ''
    const fb =
      typeof (p as { fallbackImage?: string }).fallbackImage === 'string'
        ? String((p as { fallbackImage?: string }).fallbackImage).trim()
        : ''
    if (!img && !fb) continue
    updateProduct({
      ...p,
      image: '',
      fallbackImage: '',
    })
    changed = true
  }
  if (changed) {
    const nextProducts = useStore.getState().products
    flushProductsToLocalStorage(nextProducts)
    const { syncCatalogToServerNow } = await import('@/lib/catalogSyncScheduler')
    await syncCatalogToServerNow(3)
    window.dispatchEvent(
      new CustomEvent('products-store-updated', {
        detail: { action: 'media-delete-gallery-empty', products: nextProducts },
      })
    )
  }
}

/** Clear product.image / fallbackImage when they pointed at deleted media URLs. */
export async function clearStorefrontProductsUsingMediaUrls(urls: Set<string>): Promise<void> {
  if (urls.size === 0 || typeof window === 'undefined') return
  const { useStore } = await import('@/lib/store')
  const { products, updateProduct } = useStore.getState()
  let changed = false
  for (const p of products) {
    const img = typeof p.image === 'string' ? p.image.trim() : ''
    const fb = typeof (p as { fallbackImage?: string }).fallbackImage === 'string'
      ? String((p as { fallbackImage?: string }).fallbackImage).trim()
      : ''
    const clearImage = img && productUrlMatchesDeletedSet(img, urls)
    const clearFb = fb && productUrlMatchesDeletedSet(fb, urls)
    if (!clearImage && !clearFb) continue
    updateProduct({
      ...p,
      image: clearImage ? '' : p.image,
      fallbackImage: clearFb
        ? ''
        : (p as { fallbackImage?: string }).fallbackImage,
    })
    changed = true
  }
  if (changed) {
    const products = useStore.getState().products
    flushProductsToLocalStorage(products)
    const { syncCatalogToServerNow } = await import('@/lib/catalogSyncScheduler')
    await syncCatalogToServerNow(3)
    window.dispatchEvent(
      new CustomEvent('products-store-updated', {
        detail: { action: 'media-delete', products },
      })
    )
  }
}

/** Persist products immediately so homepage/detail read fresh data before Zustand async persist. */
export function flushProductsToLocalStorage(products: unknown[]): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('selpic-store')
    let wrapper: Record<string, unknown> = {}
    if (raw) {
      try {
        wrapper = JSON.parse(raw) as Record<string, unknown>
      } catch {
        wrapper = {}
      }
    }
    if (wrapper.state && typeof wrapper.state === 'object') {
      wrapper = {
        ...wrapper,
        state: { ...(wrapper.state as object), products },
      }
    } else {
      wrapper = { state: { products, _hasHydrated: true }, version: wrapper.version ?? 0 }
    }
    localStorage.setItem('selpic-store', JSON.stringify(wrapper))
  } catch (e) {
    console.warn('[mediaDeleteSideEffects] flushProductsToLocalStorage failed:', e)
  }
}
