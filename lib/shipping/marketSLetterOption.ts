import type { ShippingOptionForPricing } from '@/lib/shipping/computeChargedShippingPrice'

/**
 * Market S (+ eligible sticker mix) untracked large letter.
 * Stable id — Admin CMS `shippingOptions` row is the live price source;
 * constants below are fallbacks when the row is missing.
 */
export const MARKET_S_UNTRACKED_LETTER_OPTION_ID = 'market-s-untracked-letter'

/** Fallback AusPost Large letter ≤125g (own envelope) — Brisbane / national. */
export const MARKET_S_UNTRACKED_LETTER_PRICE = 3.7

export const MARKET_S_UNTRACKED_LETTER_DESCRIPTION =
  'For 1–3 Single Item packs (and up to 3 sticker sheets in the same large letter) at 20 mm / 500 g or under. Tracking is not included. Choose Parcel Post if you need tracking.'

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
  freeShippingWhenThresholdMet: true,
  discountWhenThresholdMet: undefined,
}

/** Client checkout/cart shape (no dates). Prefer {@link resolveMarketSUntrackedLetterCheckoutOption}. */
export const MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION = {
  id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  name: MARKET_S_UNTRACKED_LETTER_OPTION.name,
  description: MARKET_S_UNTRACKED_LETTER_DESCRIPTION,
  price: MARKET_S_UNTRACKED_LETTER_PRICE,
  deliveryTime: MARKET_S_UNTRACKED_LETTER_OPTION.deliveryTime || '2–8 business days',
  tracking: false,
  insurance: false,
  type: 'delivery' as const,
  isDefault: false,
  order: 0,
  isActive: true,
  alwaysFree: false,
  freeShippingWhenThresholdMet: true,
  discountWhenThresholdMet: undefined as number | undefined,
}

export type MarketSUntrackedLetterCheckoutOption = typeof MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION

export type MarketSLetterCmsFields = {
  id?: string
  name?: string
  description?: string
  price?: number
  deliveryTime?: string
  tracking?: boolean
  insurance?: boolean
  isActive?: boolean
  isDefault?: boolean
  order?: number
  alwaysFree?: boolean
  freeShippingWhenThresholdMet?: boolean
  discountWhenThresholdMet?: number
}

/** Default true when unset — Admin Free Shipping Settings can turn this off. */
export function resolveMarketSLetterFreeWhenThresholdMet(
  setting: boolean | null | undefined
): boolean {
  return setting !== false
}

function pickCmsPrice(raw: unknown): number | undefined {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Number(n.toFixed(2))
}

/** Merge CMS row (if any) over code fallback; Free Shipping Settings owns free-at-threshold. */
export function resolveMarketSUntrackedLetterCheckoutOption(
  cmsOption: MarketSLetterCmsFields | null | undefined,
  freeWhenThresholdMet?: boolean | null
): MarketSUntrackedLetterCheckoutOption {
  const fromCms =
    cmsOption && String(cmsOption.id || '').trim() === MARKET_S_UNTRACKED_LETTER_OPTION_ID
      ? cmsOption
      : null
  const price = pickCmsPrice(fromCms?.price) ?? MARKET_S_UNTRACKED_LETTER_PRICE
  return {
    ...MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION,
    name: String(fromCms?.name || MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION.name).trim() ||
      MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION.name,
    description:
      String(fromCms?.description || MARKET_S_UNTRACKED_LETTER_DESCRIPTION).trim() ||
      MARKET_S_UNTRACKED_LETTER_DESCRIPTION,
    price,
    deliveryTime:
      String(fromCms?.deliveryTime || MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION.deliveryTime).trim() ||
      MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION.deliveryTime,
    tracking: fromCms?.tracking ?? false,
    insurance: fromCms?.insurance ?? false,
    isActive: fromCms?.isActive !== false,
    order: typeof fromCms?.order === 'number' ? fromCms.order : 0,
    alwaysFree: Boolean(fromCms?.alwaysFree),
    freeShippingWhenThresholdMet: resolveMarketSLetterFreeWhenThresholdMet(freeWhenThresholdMet),
    discountWhenThresholdMet:
      fromCms?.discountWhenThresholdMet !== undefined && fromCms?.discountWhenThresholdMet !== null
        ? Number(fromCms.discountWhenThresholdMet) || undefined
        : undefined,
  }
}

export function resolveMarketSUntrackedLetterPricingOption(
  cmsOption: MarketSLetterCmsFields | null | undefined,
  freeWhenThresholdMet?: boolean | null
): ShippingOptionForPricing {
  const row = resolveMarketSUntrackedLetterCheckoutOption(cmsOption, freeWhenThresholdMet)
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    deliveryTime: row.deliveryTime,
    tracking: row.tracking,
    insurance: row.insurance,
    type: 'delivery',
    isActive: row.isActive,
    alwaysFree: row.alwaysFree,
    freeShippingWhenThresholdMet: row.freeShippingWhenThresholdMet,
    discountWhenThresholdMet: row.discountWhenThresholdMet,
  }
}

/** @deprecated Use resolveMarketSUntrackedLetterCheckoutOption */
export function buildMarketSUntrackedLetterCheckoutOption(
  freeWhenThresholdMet?: boolean | null
): MarketSUntrackedLetterCheckoutOption {
  return resolveMarketSUntrackedLetterCheckoutOption(null, freeWhenThresholdMet)
}

/** @deprecated Use resolveMarketSUntrackedLetterPricingOption */
export function buildMarketSUntrackedLetterPricingOption(
  freeWhenThresholdMet?: boolean | null
): ShippingOptionForPricing {
  return resolveMarketSUntrackedLetterPricingOption(null, freeWhenThresholdMet)
}

/** Seed / hydrate: insert CMS default row when missing so Admin can edit price. */
export function ensureMarketSUntrackedLetterInShippingOptions<
  T extends { id?: string },
>(options: T[], createRow: () => T): T[] {
  const list = Array.isArray(options) ? options : []
  if (list.some((o) => String(o?.id || '').trim() === MARKET_S_UNTRACKED_LETTER_OPTION_ID)) {
    return list
  }
  return [createRow(), ...list]
}

export function createDefaultMarketSUntrackedLetterCmsRow(): {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: string
  tracking: boolean
  insurance: boolean
  type: 'delivery'
  isDefault: boolean
  order: number
  isActive: boolean
  alwaysFree: boolean
  freeShippingWhenThresholdMet: boolean
  createdAt: Date
  updatedAt: Date
} {
  const now = new Date()
  return {
    id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
    name: MARKET_S_UNTRACKED_LETTER_OPTION.name,
    description: MARKET_S_UNTRACKED_LETTER_DESCRIPTION,
    price: MARKET_S_UNTRACKED_LETTER_PRICE,
    deliveryTime: MARKET_S_UNTRACKED_LETTER_OPTION.deliveryTime || '2–8 business days',
    tracking: false,
    insurance: false,
    type: 'delivery',
    isDefault: false,
    order: 0,
    isActive: true,
    alwaysFree: false,
    freeShippingWhenThresholdMet: true,
    createdAt: now,
    updatedAt: now,
  }
}
