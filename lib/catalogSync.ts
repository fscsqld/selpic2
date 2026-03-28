import type { Product } from '@/lib/store'

function publicImageUrl(image?: string): string | undefined {
  if (!image || typeof image !== 'string') return undefined
  const t = image.trim()
  if (!t || t === 'undefined') return undefined
  if (t.startsWith('indexeddb://') || t.startsWith('data:')) return undefined
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/')) return t
  return undefined
}

function snapshotInStock(p: Product): boolean {
  const stockQty = typeof p.stockQuantity === 'number' ? Math.max(0, p.stockQuantity) : undefined
  if (typeof stockQty === 'number') return stockQty > 0
  return !!p.inStock
}

export type CatalogProductPayload = {
  id: string
  name: string
  description: string
  image?: string
  price: number
  category: string
  subcategory?: string
  inStock: boolean
  updatedAt: string
  hasDetailPage?: boolean
}

export function productsToCatalogRecords(products: Product[]): CatalogProductPayload[] {
  const now = new Date().toISOString()
  return products.map((p) => {
    const img = publicImageUrl(p.fallbackImage) || publicImageUrl(p.image)
    return {
      id: p.id,
      name: p.name,
      description: (p.description || '').slice(0, 8000),
      image: img,
      price: typeof p.price === 'number' ? p.price : 0,
      category: p.category || '',
      subcategory: p.subcategory,
      inStock: snapshotInStock(p),
      updatedAt: now,
      hasDetailPage: p.hasDetailPage
    }
  })
}

export async function syncCatalogToServer(products: Product[]): Promise<{ ok: boolean; status?: number }> {
  const secret = (process.env.NEXT_PUBLIC_CATALOG_SYNC_SECRET || '').trim()
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      console.info(
        '[catalog] Sync skipped: set CATALOG_SYNC_SECRET and NEXT_PUBLIC_CATALOG_SYNC_SECRET to the same value, then save a product as admin.'
      )
    }
    return { ok: false }
  }

  const snapshots = productsToCatalogRecords(products)
  try {
    const res = await fetch('/api/catalog/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify({ products: snapshots })
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      console.warn('[catalog] Sync failed:', res.status, data?.message || '')
      return { ok: false, status: res.status }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    console.warn('[catalog] Sync error:', e)
    return { ok: false }
  }
}
