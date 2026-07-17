import type { ShippingServiceType } from '@/lib/shipping/shippingSnapshot'

export type ProductShippingClass = 'letter' | 'parcel'

export type ProductShippingLike = {
  category?: string
  shippingClass?: ProductShippingClass
  shippingWeightGrams?: number
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

const LETTER_MAX_GRAMS = 500

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
  return resolveProductShippingClass(product) === 'letter' ? 20 : 250
}

export function getCartShippingRequirement(lines: ShippingCartLine[]): {
  requiresParcel: boolean
  totalWeightGrams: number
} {
  let totalWeightGrams = 0
  let hasParcelProduct = false

  for (const line of lines) {
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1))
    totalWeightGrams += resolveProductShippingWeightGrams(line.product) * quantity
    if (resolveProductShippingClass(line.product) === 'parcel') hasParcelProduct = true
  }

  return {
    requiresParcel: hasParcelProduct || totalWeightGrams > LETTER_MAX_GRAMS,
    totalWeightGrams,
  }
}

export function isShippingOptionCompatible(
  option: ShippingOptionEligibilityLike,
  requiresParcel: boolean
): boolean {
  if (!requiresParcel) return true
  if (option.type === 'pickup') return true

  const key = `${option.id || ''} ${option.name || ''}`.toLowerCase()
  return !/standard[\s-]*letter|tracked[\s-]*letter/.test(key)
}
