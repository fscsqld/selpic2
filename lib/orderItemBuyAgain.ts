import type { Product } from '@/lib/store'
import { getCustomizationPath, isCustomizationRequired } from './productCustomization'
import {
  likedProductStockLabel,
  resolveLikedProductStockStatus,
  type LikedProductStockStatus,
} from './likedProductStock'

export type OrderItemBuyAgain = {
  status: LikedProductStockStatus
  statusLabel: string
  /** Null when the SKU is gone from the catalogue. */
  href: string | null
  /** Button / link label for customers. */
  ctaLabel: string | null
}

/**
 * Per order-line “Buy again”: open live product (or customize), never replay cart snapshot.
 * Out of stock → PDP details only. Missing catalogue row → unavailable.
 */
export function resolveOrderItemBuyAgain(
  product: Pick<
    Product,
    'id' | 'category' | 'subcategory' | 'customizationOptions' | 'customizationMode' | 'inStock' | 'stockQuantity'
  > | null
  | undefined
): OrderItemBuyAgain {
  const status = resolveLikedProductStockStatus(product)
  const statusLabel = likedProductStockLabel(status)

  if (!product || status === 'unavailable') {
    return { status: 'unavailable', statusLabel, href: null, ctaLabel: null }
  }

  const pdp = `/products/${encodeURIComponent(product.id)}`

  if (status === 'out_of_stock') {
    return { status, statusLabel, href: pdp, ctaLabel: 'View details' }
  }

  if (isCustomizationRequired(product)) {
    return {
      status,
      statusLabel,
      href: getCustomizationPath(product),
      ctaLabel: 'Buy again',
    }
  }

  return { status, statusLabel, href: pdp, ctaLabel: 'Buy again' }
}
