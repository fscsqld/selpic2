import type { Product } from '@/lib/store'

type ProductCustomizationLike = Pick<Product, 'id' | 'category' | 'customizationOptions'>

function normalizedCategory(category?: string): string {
  return (category || '').trim().toLowerCase()
}

export function isCustomizationRequired(product: ProductCustomizationLike): boolean {
  const category = normalizedCategory(product.category)
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
