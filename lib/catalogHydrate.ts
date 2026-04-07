import type { Product } from '@/lib/store'

/** Matches `CatalogProductRecord` from `lib/server/catalogStore` (client-safe duplicate). */
export type CatalogProductSnapshot = {
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

const PLACEHOLDER_IMAGE = '/logo.svg'

export function catalogSnapshotsToProducts(records: CatalogProductSnapshot[]): Product[] {
  return records.map((r) => {
    const image =
      typeof r.image === 'string' && r.image.trim() && !r.image.startsWith('indexeddb://')
        ? r.image.trim()
        : PLACEHOLDER_IMAGE
    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      price: typeof r.price === 'number' && Number.isFinite(r.price) ? r.price : 0,
      image,
      category: r.category || '',
      subcategory: r.subcategory,
      inStock: !!r.inStock,
      hasDetailPage: r.hasDetailPage
    } as Product
  })
}
