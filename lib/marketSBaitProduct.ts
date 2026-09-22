import type { Product } from '@/lib/store'
import { isMarketSCatalogProduct } from '@/lib/marketSSubcategory'

const BAIT_PRICE = 2.5
const BAIT_PRICE_TOLERANCE = 0.009
const BAIT_NAME = /mediheel|tea\s*tree|teatree/i

function isSellable(product: Product): boolean {
  if (product.inStock === false) return false
  if (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0) return false
  return true
}

/** Mediheel ~$2.50 add-on for sticker PDP / cart. Hidden until that SKU exists. */
export function findMarketSBaitProduct(products: Product[]): Product | null {
  const hit = products.find((product) => {
    if (!isMarketSCatalogProduct(product)) return false
    if (!isSellable(product)) return false
    const price = Number(product.price)
    if (!Number.isFinite(price) || Math.abs(price - BAIT_PRICE) > BAIT_PRICE_TOLERANCE) return false
    const haystack = `${product.name} ${product.description || ''} ${product.brand || ''}`
    return BAIT_NAME.test(haystack)
  })
  return hit || null
}

export function cartAlreadyHasProduct(cartProductIds: Array<string | undefined>, productId: string): boolean {
  return cartProductIds.some((id) => String(id || '') === String(productId))
}
