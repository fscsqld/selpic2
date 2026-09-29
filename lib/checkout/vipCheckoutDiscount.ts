/**
 * VIP checkout discount — mirrors contentStore.getVIPGradeBenefitForCheckout
 * without importing the Zustand store (safe for server).
 */

export type VipGradeBenefitLike = {
  gradeCode: number
  gradeName?: string
  isActive?: boolean
  minPurchaseAmount?: number
  baseDiscountPercentage: number
  categoryDiscounts?: Record<string, number>
  maxDiscountAmount?: number
  freeShipping?: boolean
  allowPromoCodeStacking?: boolean
  eventStartDate?: string
  eventEndDate?: string
  eventDiscountPercentage?: number
  eventMaxDiscountAmount?: number
  eventFreeShipping?: boolean
}

export type VipCartLine = {
  productId: string
  category?: string
  price: number
}

function normalizeCategory(raw?: string): string {
  const lower = (raw || '').toLowerCase()
  if (lower.includes('market s') || lower.includes('market-s') || lower === 'markets') return 'HotGoods'
  if (
    lower.includes('phone case') ||
    lower.includes('phone-case') ||
    lower.includes('phonecase') ||
    lower.includes('phone cases')
  ) {
    return 'HotGoods'
  }
  if (lower.includes('sticker')) return 'Stickers'
  if (lower.includes('stamp')) return 'Stamps'
  if (
    lower.includes('hotgoods') ||
    lower.includes('hot goods') ||
    lower.includes('hot-goods') ||
    lower === 'hot'
  ) {
    return 'HotGoods'
  }
  return raw || 'Other'
}

function normalizeCategoryDiscounts(categoryDiscounts?: Record<string, number>): Record<string, number> {
  if (!categoryDiscounts) return {}
  const normalized: Record<string, number> = {}
  Object.entries(categoryDiscounts).forEach(([key, value]) => {
    const normKey = normalizeCategory(key)
    if (normKey) normalized[normKey] = value
  })
  return normalized
}

export function computeVipCheckoutBenefit(
  benefits: VipGradeBenefitLike[],
  gradeCode: number,
  subtotal: number,
  cartItems?: VipCartLine[],
  currentDate = new Date()
): { discount: number; freeShipping: boolean; benefit: VipGradeBenefitLike } | null {
  const benefit = benefits.find((b) => b.gradeCode === gradeCode && b.isActive !== false)
  if (!benefit) return null

  if (benefit.minPurchaseAmount && benefit.minPurchaseAmount > 0 && subtotal < benefit.minPurchaseAmount) {
    return null
  }

  const isEventActive =
    Boolean(benefit.eventStartDate && benefit.eventEndDate) &&
    currentDate >= new Date(benefit.eventStartDate as string) &&
    currentDate <= new Date(benefit.eventEndDate as string)

  let discount = 0
  let freeShipping = Boolean(benefit.freeShipping)
  let maxDiscount = benefit.maxDiscountAmount

  const normalizedCategoryDiscounts = normalizeCategoryDiscounts(benefit.categoryDiscounts)
  if (benefit.gradeCode === 3 && normalizedCategoryDiscounts['HotGoods'] === undefined) {
    normalizedCategoryDiscounts['HotGoods'] = 5
  }
  if (benefit.gradeCode === 4 && normalizedCategoryDiscounts['HotGoods'] === undefined) {
    normalizedCategoryDiscounts['HotGoods'] = 10
  }

  if (cartItems && cartItems.length > 0) {
    const categorySubtotals: Record<string, number> = {}
    cartItems.forEach((item) => {
      const category = normalizeCategory(item.category)
      categorySubtotals[category] = (categorySubtotals[category] || 0) + item.price
    })

    Object.keys(categorySubtotals).forEach((category) => {
      const categorySubtotal = categorySubtotals[category]
      let categoryDiscountPercentage = 0

      if (category === 'Stickers' || category === 'Stamps') {
        categoryDiscountPercentage = benefit.baseDiscountPercentage
      } else if (category === 'HotGoods') {
        const hotGoodsDiscount = normalizedCategoryDiscounts['HotGoods']
        categoryDiscountPercentage = typeof hotGoodsDiscount === 'number' ? hotGoodsDiscount : 0
      } else {
        categoryDiscountPercentage = benefit.baseDiscountPercentage
      }

      if (isEventActive && benefit.eventDiscountPercentage !== undefined) {
        if (category === 'Stickers' || category === 'Stamps') {
          categoryDiscountPercentage += benefit.eventDiscountPercentage
        }
      }

      discount += (categorySubtotal * categoryDiscountPercentage) / 100
    })
  } else if (isEventActive && benefit.eventDiscountPercentage !== undefined) {
    const totalDiscountPercentage = benefit.baseDiscountPercentage + benefit.eventDiscountPercentage
    discount = (subtotal * totalDiscountPercentage) / 100
    if (benefit.eventMaxDiscountAmount) maxDiscount = benefit.eventMaxDiscountAmount
    if (benefit.eventFreeShipping !== undefined) freeShipping = benefit.eventFreeShipping
  } else {
    discount = (subtotal * benefit.baseDiscountPercentage) / 100
  }

  if (maxDiscount) discount = Math.min(discount, maxDiscount)
  discount = Math.min(discount, subtotal)
  discount = Number(discount.toFixed(2))

  return { discount, freeShipping, benefit }
}
