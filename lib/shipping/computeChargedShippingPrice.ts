import type { ShippingOptionLike, ShippingServiceType } from '@/lib/shipping/shippingSnapshot'

export type FreeShippingSettingsLike = {
  enabled: boolean
  threshold: number
}

export type ShippingOptionForPricing = ShippingOptionLike & {
  alwaysFree?: boolean
  freeShippingWhenThresholdMet?: boolean
  discountWhenThresholdMet?: number
  isActive?: boolean
  type?: ShippingServiceType
}

/**
 * Charged shipping after threshold / always-free rules (no VIP).
 * Matches storefront checkout non-VIP branches.
 */
export function computeChargedShippingPrice(
  option: ShippingOptionForPricing,
  itemsSubtotal: number,
  freeShipping: FreeShippingSettingsLike,
  vipFreeShipping = false
): number {
  if (vipFreeShipping) return 0
  if (option.alwaysFree) return 0

  const list = Number(option.price) || 0
  const sub = Number(itemsSubtotal) || 0

  if (freeShipping.enabled && sub >= freeShipping.threshold) {
    if (option.freeShippingWhenThresholdMet) return 0
    const discount = Number(option.discountWhenThresholdMet) || 0
    if (discount > 0) {
      const discounted = list - discount
      return discounted > 0 ? Number(discounted.toFixed(2)) : 0
    }
  }

  return Number(list.toFixed(2))
}
