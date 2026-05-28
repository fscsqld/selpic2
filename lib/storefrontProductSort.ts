/** Storefront product list sort — uses catalog `price` (Mixed Labels: registered list price). */

export type StorefrontPriceSort = 'price-low' | 'price-high' | 'default'

export function compareProductsByCatalogPrice(
  a: { price: number; name?: string; subcategory?: string },
  b: { price: number; name?: string; subcategory?: string },
  sortBy: StorefrontPriceSort
): number {
  if (sortBy === 'default') return 0
  const aPrice = Number(a.price)
  const bPrice = Number(b.price)
  const safeA = Number.isFinite(aPrice) ? aPrice : 0
  const safeB = Number.isFinite(bPrice) ? bPrice : 0
  const diff = sortBy === 'price-low' ? safeA - safeB : safeB - safeA
  if (diff !== 0) return diff
  const subcategoryDiff = (a.subcategory || '').localeCompare(b.subcategory || '', undefined, {
    sensitivity: 'base',
  })
  if (subcategoryDiff !== 0) return subcategoryDiff
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
}

export function sortProductsByCatalogPrice<
  T extends { price: number; name?: string; subcategory?: string },
>(
  products: T[],
  sortBy: StorefrontPriceSort = 'price-low'
): T[] {
  if (sortBy === 'default') return [...products]
  return [...products].sort((a, b) => compareProductsByCatalogPrice(a, b, sortBy))
}
