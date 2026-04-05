import type { Product } from '@/lib/store'
import type { CatalogProductRecord } from '@/lib/server/catalogStore'

const PLACEHOLDER_IMAGE = '/images/logo.png'

function isCatalogRecord(r: unknown): r is CatalogProductRecord {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  const desc = o.description
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.name === 'string' &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    typeof o.category === 'string' &&
    typeof o.inStock === 'boolean' &&
    typeof o.updatedAt === 'string' &&
    (desc === undefined || typeof desc === 'string')
  )
}

export function catalogRecordsToProducts(records: unknown): Product[] {
  if (!Array.isArray(records)) return []
  return records.filter(isCatalogRecord).map((r) => {
    const img = typeof r.image === 'string' ? r.image.trim() : ''
    return {
      id: r.id,
      name: r.name,
      price: r.price,
      image: img || PLACEHOLDER_IMAGE,
      category: r.category,
      subcategory: r.subcategory,
      description: typeof r.description === 'string' ? r.description : String(r.description ?? ''),
      inStock: r.inStock,
      hasDetailPage: r.hasDetailPage,
      customizationOptions: [],
    }
  })
}

/**
 * Storefront: visitors have no localStorage products. Load published catalog from the server
 * (written by admin catalog sync → data/catalog/products.json).
 */
export async function fetchPublicCatalogAndApplyIfEmpty(): Promise<void> {
  const { useStore } = await import('@/lib/store')
  const { products } = useStore.getState()
  if (products.length > 0) return

  try {
    const res = await fetch('/api/catalog/public', { cache: 'no-store' })
    if (!res.ok) return
    let data: unknown
    try {
      data = await res.json()
    } catch {
      return
    }
    const list = data && typeof data === 'object' && 'products' in data ? (data as { products: unknown }).products : undefined
    const mapped = catalogRecordsToProducts(list)
    if (mapped.length === 0) return

    useStore.setState({ products: mapped })
  } catch {
    /* non-fatal */
  }
}
