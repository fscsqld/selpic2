import { isMarketSCatalogProduct } from '../marketSSubcategory'
import {
  MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  resolveMarketSUntrackedLetterCheckoutOption,
  type MarketSLetterCmsFields,
  type MarketSUntrackedLetterCheckoutOption,
} from './marketSLetterOption'
import type { ShippingServiceType } from './shippingSnapshot'

export type ProductShippingClass = 'letter' | 'parcel'

export type ProductShippingLike = {
  category?: string
  subcategory?: string
  isHotGoods?: boolean
  shippingClass?: ProductShippingClass
  shippingWeightGrams?: number
  /** Packed thickness per sellable unit (mm). Defaults to 5 mm for Market S singles. */
  shippingThicknessMm?: number
}

export type ShippingOptionEligibilityLike = {
  id?: string
  name?: string
  type?: ShippingServiceType | string
}

export type ShippingCartLine = {
  product: ProductShippingLike
  quantity?: number
}

export type CartShippingRequirement = {
  requiresParcel: boolean
  allowUntrackedMaskLetter: boolean
  totalWeightGrams: number
  maskSingleQuantity: number
  /** Sticker sheet count (Stickers category qty) — mixed letter cap. */
  stickerSheetQuantity: number
  packedThicknessMm: number
}

const LETTER_MAX_GRAMS = 500
const MASK_LETTER_MAX_QTY = 3
const MASK_LETTER_MAX_PACK_MM = 20
const DEFAULT_MASK_THICKNESS_MM = 5
/** Mixed Market S + stickers: max sticker sheets in one large letter. */
export const MIXED_LETTER_MAX_STICKER_SHEETS = 3
/** Conservative pack height per name-label sheet when mixed with masks. */
const DEFAULT_STICKER_SHEET_THICKNESS_MM = 1

/**
 * Backward-compatible defaults for products created before shipping fields existed.
 * Stickers are treated as letters; physical merchandise is treated as parcels.
 */
export function resolveProductShippingClass(product: ProductShippingLike): ProductShippingClass {
  if (product.shippingClass === 'letter' || product.shippingClass === 'parcel') {
    return product.shippingClass
  }
  return String(product.category || '').trim().toLowerCase() === 'stickers' ? 'letter' : 'parcel'
}

export function resolveProductShippingWeightGrams(product: ProductShippingLike): number {
  const configured = Number(product.shippingWeightGrams)
  if (Number.isFinite(configured) && configured > 0) return Math.round(configured)
  if (isMarketSMaskSingle(product)) return 40
  return resolveProductShippingClass(product) === 'letter' ? 20 : 250
}

function subcategoryOf(product: ProductShippingLike): string {
  return String(product.subcategory || '').trim()
}

export function isMarketSMaskSingle(product: ProductShippingLike): boolean {
  return isMarketSCatalogProduct(product) && subcategoryOf(product) === 'Single Item'
}

export function isMarketSFamilyBundle(product: ProductShippingLike): boolean {
  return isMarketSCatalogProduct(product) && subcategoryOf(product) === 'Family Bundle'
}

export function isStickersShippingProduct(product: ProductShippingLike): boolean {
  return String(product.category || '').trim().toLowerCase() === 'stickers'
}

export function resolveMaskPackThicknessMm(product: ProductShippingLike): number {
  const configured = Number(product.shippingThicknessMm)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_MASK_THICKNESS_MM
}

function isCmsLetterOption(option: ShippingOptionEligibilityLike): boolean {
  if (option.id === MARKET_S_UNTRACKED_LETTER_OPTION_ID) return true
  const key = `${option.id || ''} ${option.name || ''}`.toLowerCase()
  return /standard[\s-]*letter|tracked[\s-]*letter/.test(key)
}

/**
 * Dual-rate for Market S mask singles (+ optional small sticker add-on):
 * 1–3 Single Item units, ≤3 sticker sheets, packed ≤20 mm / ≤500 g → untracked letter.
 * Qty 4+, Family Bundle, other parcel SKUs, stamps/non-sticker letter, or over caps → parcel.
 */
export function getCartShippingRequirement(lines: ShippingCartLine[]): CartShippingRequirement {
  let totalWeightGrams = 0
  let maskSingleQuantity = 0
  let stickerSheetQuantity = 0
  let packedThicknessMm = 0
  let hasFamilyBundle = false
  let hasOtherParcel = false
  let hasNonStickerLetterProduct = false
  let hasMaskSingle = false

  for (const line of lines) {
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1))
    const product = line.product || {}
    totalWeightGrams += resolveProductShippingWeightGrams(product) * quantity

    if (isMarketSFamilyBundle(product)) {
      hasFamilyBundle = true
      continue
    }
    if (isMarketSMaskSingle(product)) {
      hasMaskSingle = true
      maskSingleQuantity += quantity
      packedThicknessMm += resolveMaskPackThicknessMm(product) * quantity
      continue
    }
    if (isStickersShippingProduct(product)) {
      stickerSheetQuantity += quantity
      packedThicknessMm += DEFAULT_STICKER_SHEET_THICKNESS_MM * quantity
      continue
    }
    if (resolveProductShippingClass(product) === 'parcel') {
      hasOtherParcel = true
    } else {
      hasNonStickerLetterProduct = true
    }
  }

  const allowUntrackedMaskLetter =
    hasMaskSingle &&
    !hasFamilyBundle &&
    !hasOtherParcel &&
    !hasNonStickerLetterProduct &&
    stickerSheetQuantity <= MIXED_LETTER_MAX_STICKER_SHEETS &&
    maskSingleQuantity >= 1 &&
    maskSingleQuantity <= MASK_LETTER_MAX_QTY &&
    packedThicknessMm <= MASK_LETTER_MAX_PACK_MM &&
    totalWeightGrams <= LETTER_MAX_GRAMS

  const requiresParcel =
    !allowUntrackedMaskLetter &&
    (hasFamilyBundle ||
      hasOtherParcel ||
      hasMaskSingle ||
      hasNonStickerLetterProduct ||
      totalWeightGrams > LETTER_MAX_GRAMS)

  return {
    requiresParcel,
    allowUntrackedMaskLetter,
    totalWeightGrams,
    maskSingleQuantity,
    stickerSheetQuantity,
    packedThicknessMm,
  }
}

export function isShippingOptionCompatible(
  option: ShippingOptionEligibilityLike,
  requirement: CartShippingRequirement | boolean
): boolean {
  const requiresParcel =
    typeof requirement === 'boolean' ? requirement : requirement.requiresParcel
  const allowUntrackedMaskLetter =
    typeof requirement === 'boolean' ? false : requirement.allowUntrackedMaskLetter

  if (option.type === 'pickup') return true

  if (allowUntrackedMaskLetter) {
    if (option.id === MARKET_S_UNTRACKED_LETTER_OPTION_ID) return true
    if (isCmsLetterOption(option)) return false
    return true
  }

  if (requiresParcel) {
    return !isCmsLetterOption(option)
  }

  return option.id !== MARKET_S_UNTRACKED_LETTER_OPTION_ID
}

export type MergeShippingOptionsParams = {
  /** From Admin Free Shipping Settings; default true when omitted. */
  marketSLetterFreeWhenThresholdMet?: boolean | null
}

export function mergeShippingOptionsForCart<T extends ShippingOptionEligibilityLike>(
  cmsOptions: T[],
  requirement: CartShippingRequirement,
  params?: MergeShippingOptionsParams
): Array<T | MarketSUntrackedLetterCheckoutOption> {
  const cmsMarketS = cmsOptions.find(
    (option) => String(option.id || '').trim() === MARKET_S_UNTRACKED_LETTER_OPTION_ID
  ) as (T & MarketSLetterCmsFields) | undefined
  const withoutMarketS = cmsOptions.filter(
    (option) => String(option.id || '').trim() !== MARKET_S_UNTRACKED_LETTER_OPTION_ID
  )
  const marketSRow = resolveMarketSUntrackedLetterCheckoutOption(
    cmsMarketS,
    params?.marketSLetterFreeWhenThresholdMet
  )
  const merged = requirement.allowUntrackedMaskLetter
    ? ([marketSRow, ...withoutMarketS] as Array<T | MarketSUntrackedLetterCheckoutOption>)
    : withoutMarketS
  return merged.filter((option) => isShippingOptionCompatible(option, requirement))
}
