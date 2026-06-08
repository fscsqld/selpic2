import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'
import {
  getMixedLabelsBundleUnitPrice,
  resolveMixedLabelsSheetBundle,
  type MixedLabelsSheetBundle,
} from '@/lib/mixedLabelsPricing'
import { resolveStickerSheetBundle, type StickerSheetBundle } from '@/lib/stickerSheetBundles'

export type StorefrontLinePriceBreakdown = {
  unitPrice: number
  baseUnitPrice: number
  customizationSurchargePerUnit: number
  mixedLabelsBundle?: MixedLabelsSheetBundle
  stickerPackBundle?: StickerSheetBundle
}

export function getStorefrontLineUnitPrice(
  product: {
    price: number
    mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]
    enableStickerPackOptions?: boolean
    stickerSheetBundles?: StickerSheetBundle[]
    size?: string
  },
  customizations?: Record<string, string>
): number {
  return getStorefrontLinePriceBreakdown(product, customizations).unitPrice
}

/**
 * GST-inclusive unit price for cart, checkout, and server payment validation.
 * Mixed Labels: unit price = selected sheet bundle price (× cart quantity at checkout).
 */
export function getStorefrontLinePriceBreakdown(
  product: {
    price: number
    mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]
    enableStickerPackOptions?: boolean
    stickerSheetBundles?: StickerSheetBundle[]
    size?: string
  },
  customizations?: Record<string, string>
): StorefrontLinePriceBreakdown {
  const mixedBundle = resolveMixedLabelsSheetBundle(product, customizations)
  if (mixedBundle) {
    return {
      unitPrice: mixedBundle.price,
      baseUnitPrice: mixedBundle.price,
      customizationSurchargePerUnit: 0,
      mixedLabelsBundle: mixedBundle,
    }
  }

  const stickerPack = resolveStickerSheetBundle(product, customizations)
  if (stickerPack) {
    const customizationSurchargePerUnit = getCustomizationSurchargePerUnit(customizations, {
      size: product.size,
    })
    const unitPrice = Number((stickerPack.price + customizationSurchargePerUnit).toFixed(2))
    return {
      unitPrice,
      baseUnitPrice: Number(stickerPack.price.toFixed(2)),
      customizationSurchargePerUnit: Number(customizationSurchargePerUnit.toFixed(2)),
      stickerPackBundle: stickerPack,
    }
  }

  const baseUnitPrice =
    typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0
  const customizationSurchargePerUnit = getCustomizationSurchargePerUnit(customizations, {
    size: (product as { size?: string }).size,
  })
  const unitPrice = Number((baseUnitPrice + customizationSurchargePerUnit).toFixed(2))
  return {
    unitPrice,
    baseUnitPrice: Number(baseUnitPrice.toFixed(2)),
    customizationSurchargePerUnit: Number(customizationSurchargePerUnit.toFixed(2)),
  }
}
