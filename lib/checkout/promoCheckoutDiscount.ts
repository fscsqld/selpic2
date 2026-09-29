/**
 * Promo checkout discount — mirrors checkout page apply + contentStore validate basics.
 */

export type PromoCodeLike = {
  code: string
  isActive?: boolean
  startDate?: string
  endDate?: string
  usageLimit?: number
  usageCount?: number
  userUsageLimit?: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  discountType: 'percentage' | 'fixed' | string
  discountValue: number
  applicableCategories?: string[]
  allowVIPStacking?: boolean
}

export type PromoCartLine = { productId: string; category?: string }

export function findPromoByCode(promos: PromoCodeLike[], codeString: string): PromoCodeLike | undefined {
  const needle = codeString.trim().toUpperCase()
  if (!needle) return undefined
  return promos.find((p) => String(p.code || '').toUpperCase() === needle)
}

export function validatePromoCodeForCheckout(
  promo: PromoCodeLike | undefined,
  subtotal: number,
  cartItems?: PromoCartLine[],
  userUsageCount = 0,
  now = new Date()
): { valid: true; promo: PromoCodeLike } | { valid: false; error: string } {
  if (!promo) return { valid: false, error: 'Promo code not found' }
  if (promo.isActive === false) return { valid: false, error: 'Promo code is not active' }
  if (promo.startDate && new Date(promo.startDate) > now) {
    return { valid: false, error: 'Promo code has not started yet' }
  }
  if (promo.endDate && new Date(promo.endDate) < now) {
    return { valid: false, error: 'Promo code has expired' }
  }
  if (promo.usageLimit != null && (promo.usageCount || 0) >= promo.usageLimit) {
    return { valid: false, error: 'Promo code usage limit reached' }
  }
  if (promo.userUsageLimit != null && userUsageCount >= promo.userUsageLimit) {
    return {
      valid: false,
      error: `You have already used this promo code ${promo.userUsageLimit} time(s). Maximum usage limit reached.`,
    }
  }
  if (promo.minPurchaseAmount && subtotal < promo.minPurchaseAmount) {
    return { valid: false, error: `Minimum purchase amount of $${promo.minPurchaseAmount} required` }
  }
  if (promo.applicableCategories && promo.applicableCategories.length > 0 && cartItems) {
    const cartCategories = cartItems.map((item) => item.category).filter(Boolean) as string[]
    const hasApplicable = cartCategories.some((cat) => promo.applicableCategories?.includes(cat))
    if (!hasApplicable) {
      return { valid: false, error: 'Promo code does not apply to items in your cart' }
    }
  }
  return { valid: true, promo }
}

/** Same math as checkout page when applying a validated promo. */
export function computePromoDiscountAmount(promo: PromoCodeLike, subtotal: number): number {
  let discount = 0
  if (promo.discountType === 'percentage') {
    discount = (subtotal * promo.discountValue) / 100
    if (promo.maxDiscountAmount) {
      discount = Math.min(discount, promo.maxDiscountAmount)
    }
  } else {
    discount = promo.discountValue
  }
  discount = Math.min(discount, subtotal)
  return Number(discount.toFixed(2))
}
