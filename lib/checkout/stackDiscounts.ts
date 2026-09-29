/**
 * VIP + promo stacking — same rules as checkout page buildOrderPayload / calculateTotal.
 */
export function stackVipAndPromoDiscounts(args: {
  subtotal: number
  vipDiscount: number
  promoDiscount: number
  vipAllowsStacking: boolean
  promoAllowsStacking: boolean
}): number {
  const { subtotal, vipDiscount, promoDiscount, vipAllowsStacking, promoAllowsStacking } = args
  if (vipDiscount > 0 && promoDiscount > 0) {
    if (vipAllowsStacking && promoAllowsStacking) {
      return Math.min(vipDiscount + promoDiscount, subtotal)
    }
    return Math.max(vipDiscount, promoDiscount)
  }
  return Math.min(vipDiscount + promoDiscount, subtotal)
}
