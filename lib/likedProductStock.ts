import type { Product } from '@/lib/store'

/** Customer-facing stock state for liked / listing helpers. */
export type LikedProductStockStatus = 'in_stock' | 'out_of_stock' | 'unavailable'

/**
 * Resolve whether a catalog product can be bought.
 * Prefer stockQuantity when present; otherwise inStock flag.
 * Missing product → unavailable (deleted / not in public catalog).
 */
export function resolveLikedProductStockStatus(
  product: Pick<Product, 'inStock' | 'stockQuantity'> | null | undefined
): LikedProductStockStatus {
  if (!product) return 'unavailable'
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
