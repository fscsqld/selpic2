/** Admin merchandising flags that listing cards must surface (not only PDP). */
export type ProductCardMerchFlags = {
  isNew?: boolean
  isBestSeller?: boolean
  isPopular?: boolean
  isLimitedEdition?: boolean
  price?: number
  originalPrice?: number
}

export type ProductCardMerchBadges = {
  showDiscount: boolean
  showNewArrival: boolean
  showBestSeller: boolean
  showPopular: boolean
  showLimitedEdition: boolean
}

/**
 * Stickers/hub `ProductCard` and Market S listing must honor the same admin checkboxes.
 * Discount % is price-based (originalPrice > price), not a merch checkbox.
 */
export function resolveProductCardMerchBadges(
  product: ProductCardMerchFlags
): ProductCardMerchBadges {
  const price = typeof product.price === 'number' ? product.price : NaN
  const original =
    typeof product.originalPrice === 'number' ? product.originalPrice : NaN
  return {
    showDiscount: Number.isFinite(original) && Number.isFinite(price) && original > price,
    showNewArrival: !!product.isNew,
    showBestSeller: !!product.isBestSeller,
    showPopular: !!product.isPopular,
    showLimitedEdition: !!product.isLimitedEdition,
  }
}

export function productCardHasAnyMerchBadge(badges: ProductCardMerchBadges): boolean {
  return (
    badges.showDiscount ||
    badges.showNewArrival ||
    badges.showBestSeller ||
    badges.showPopular ||
    badges.showLimitedEdition
  )
}
