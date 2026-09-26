import type { ShippingOptionForPricing } from '@/lib/shipping/computeChargedShippingPrice'

/**
 * Synthetic option: CMS Standard Letter stays for sticker-only carts.
 * Market S (and eligible sticker+mask mixes) use this AusPost Large Letter ≤125g rate.
 * Price aligned to AusPost regular Large letter up to 125g (own envelope) as published 2026.
 */
export const MARKET_S_UNTRACKED_LETTER_OPTION_ID = 'market-s-untracked-letter'

/** AusPost Large letter ≤125g (own envelope) — Brisbane / national letter rate. */
export const MARKET_S_UNTRACKED_LETTER_PRICE = 3.7

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
  /** Overridden at runtime from Free Shipping Settings (default ON). */
  freeShippingWhenThresholdMet: true,
  discountWhenThresholdMet: undefined,
}

export const MARKET_S_UNTRACKED_LETTER_DESCRIPTION =
  'For 1–3 Single Item packs (and up to 3 sticker sheets in the same large letter) at 20 mm / 500 g or under. Tracking is not included. Choose Parcel Post if you need tracking.'

/**
 * Client checkout/cart list row. Dates omitted so SSR markup stays stable.
 * Call {@link buildMarketSUntrackedLetterCheckoutOption} so threshold-free follows Admin.
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
  freeShippingWhenThresholdMet: true,
  discountWhenThresholdMet: undefined as number | undefined,
}

export type MarketSUntrackedLetterCheckoutOption = typeof MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION

/** Default true when unset — Admin Free Shipping Settings can turn this off. */
export function resolveMarketSLetterFreeWhenThresholdMet(
  setting: boolean | null | undefined
): boolean {
  return setting !== false
}

export function buildMarketSUntrackedLetterCheckoutOption(
  freeWhenThresholdMet?: boolean | null
): MarketSUntrackedLetterCheckoutOption {
  return {
    ...MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION,
    freeShippingWhenThresholdMet: resolveMarketSLetterFreeWhenThresholdMet(freeWhenThresholdMet),
  }
}

export function buildMarketSUntrackedLetterPricingOption(
  freeWhenThresholdMet?: boolean | null
): ShippingOptionForPricing {
  return {
    ...MARKET_S_UNTRACKED_LETTER_OPTION,
    freeShippingWhenThresholdMet: resolveMarketSLetterFreeWhenThresholdMet(freeWhenThresholdMet),
  }
}
