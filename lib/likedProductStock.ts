import type { Product } from './store'
import {
  getMarketSPreorderUnitsLeft,
  isMarketSComingSoonProduct,
  isMarketSPreorderOpen,
  type MarketSPreorderFields,
} from './marketSPreorder'

/** Customer-facing stock state for liked / listing helpers. */
export type LikedProductStockStatus = 'in_stock' | 'out_of_stock' | 'unavailable'

type StockProduct = (Pick<Product, 'inStock' | 'stockQuantity'> &
  Partial<MarketSPreorderFields>) | null | undefined

/**
 * Resolve whether a catalog product can be bought.
 * Prefer stockQuantity when present; otherwise inStock flag.
 * Open Market S pre-order SKUs are purchasable even at stock 0.
 * Missing product → unavailable (deleted / not in public catalog).
 */
export function resolveLikedProductStockStatus(
  product: StockProduct
): LikedProductStockStatus {
  if (!product) return 'unavailable'
  if (isMarketSComingSoonProduct(product)) return 'out_of_stock'
  if (isMarketSPreorderOpen(product)) {
    return getMarketSPreorderUnitsLeft(product) > 0 ? 'in_stock' : 'out_of_stock'
  }
  if (typeof product.stockQuantity === 'number' && Number.isFinite(product.stockQuantity)) {
    return product.stockQuantity > 0 ? 'in_stock' : 'out_of_stock'
  }
  if (product.inStock === false) return 'out_of_stock'
  if (product.inStock === true) return 'in_stock'
  return 'unavailable'
}

export function likedProductStockLabel(status: LikedProductStockStatus): string {
  switch (status) {
    case 'in_stock':
      return 'In stock'
    case 'out_of_stock':
      return 'Out of stock'
    case 'unavailable':
      return 'No longer available'
  }
}

/**
 * True when the SKU cannot be purchased (stock 0 or inStock false).
 * Open Market S pre-order is not treated as out of stock.
 * Missing product is treated as out of stock for cart/CTA guards.
 */
export function isProductOutOfStock(product: StockProduct): boolean {
  const status = resolveLikedProductStockStatus(product)
  return status === 'out_of_stock' || status === 'unavailable'
}
