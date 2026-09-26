import type { ShippingOptionForPricing } from '@/lib/shipping/computeChargedShippingPrice'

/** Synthetic option: CMS still has $2.40 Standard Letter, not this AusPost mask-single rate. */
export const MARKET_S_UNTRACKED_LETTER_OPTION_ID = 'market-s-untracked-letter'

export const MARKET_S_UNTRACKED_LETTER_PRICE = 3.2

export const MARKET_S_UNTRACKED_LETTER_OPTION: ShippingOptionForPricing = {
  id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  name: 'Untracked letter (Market S singles)',
  price: MARKET_S_UNTRACKED_LETTER_PRICE,
  deliveryTime: '2–8 business days',
  tracking: false,
  insurance: false,
  type: 'delivery',
  isActive: true,
  alwaysFree: false,
  freeShippingWhenThresholdMet: false,
  discountWhenThresholdMet: undefined,
}

export const MARKET_S_UNTRACKED_LETTER_DESCRIPTION =
  'For 1–3 Single Item mask packs at 20 mm or under. Tracking is not included. Choose Parcel Post if you need tracking.'

/**
 * Client checkout/cart list row. Dates omitted so SSR markup stays stable.
 * Free-ship fields must match {@link ShippingOption} so cart/checkout pricing
 * can read alwaysFree / threshold props without a cast-only workaround.
 */
export const MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION = {
  id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  name: MARKET_S_UNTRACKED_LETTER_OPTION.name,
  description: MARKET_S_UNTRACKED_LETTER_DESCRIPTION,
  price: MARKET_S_UNTRACKED_LETTER_PRICE,
  deliveryTime: MARKET_S_UNTRACKED_LETTER_OPTION.deliveryTime || '2–8 business days',
  tracking: false,
  insurance: false,
  type: 'delivery' as const,
  isDefault: true,
  order: 0,
  isActive: true,
  alwaysFree: false,
  freeShippingWhenThresholdMet: false,
  discountWhenThresholdMet: undefined as number | undefined,
}
