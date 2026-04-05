import type { Product } from '@/lib/store'
import type { CatalogProductRecord } from '@/lib/server/catalogStore'

const PLACEHOLDER_IMAGE = '/images/logo.png'

export function catalogRecordsToProducts(records: CatalogProductRecord[]): Product[] {
  return records.map((r) => {
    const img = typeof r.image === 'string' ? r.image.trim() : ''
    return {
      id: r.id,
      name: r.name,
      price: r.price,
      image: img || PLACEHOLDER_IMAGE,
      category: r.category,
      subcategory: r.subcategory,
      description: r.description || '',
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
    const data = (await res.json()) as { products?: CatalogProductRecord[] }
    const list = data?.products
    if (!Array.isArray(list) || list.length === 0) return

    useStore.setState({ products: catalogRecordsToProducts(list) })
  } catch {
    /* non-fatal */
  }
}
