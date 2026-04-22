import type { Product } from '@/lib/store'

type ProductCustomizationLike = Pick<Product, 'id' | 'category' | 'subcategory' | 'customizationOptions'>

function normalizedCategory(category?: string): string {
  return (category || '').trim().toLowerCase()
}

function normalizedSubcategory(subcategory?: string): string {
  return (subcategory || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
}

export function isCustomizationRequired(product: ProductCustomizationLike): boolean {
  const category = normalizedCategory(product.category)
  const subcategory = normalizedSubcategory(product.subcategory)
  // Stationery Essentials is a non-custom, file-based sticker product group.
  if (category === 'stickers' && subcategory === 'stationery essentials') return false
  if (category === 'stickers') return true
  return Array.isArray(product.customizationOptions) && product.customizationOptions.length > 0
}

export function getCustomizationPath(product: ProductCustomizationLike): string {
  const category = normalizedCategory(product.category)
  const encodedProductId = encodeURIComponent(product.id)
  if (category === 'stickers') return `/stickers/customize?product=${encodedProductId}`
  if (category === 'stamps') return `/stamp/customize?product=${encodedProductId}`
  return `/customize?product=${encodedProductId}`
}
