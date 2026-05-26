import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'
import {
  getMixedLabelsBundleUnitPrice,
  resolveMixedLabelsSheetBundle,
  type MixedLabelsSheetBundle,
} from '@/lib/mixedLabelsPricing'

export type StorefrontLinePriceBreakdown = {
  unitPrice: number
  baseUnitPrice: number
  customizationSurchargePerUnit: number
  mixedLabelsBundle?: MixedLabelsSheetBundle
}

export function getStorefrontLineUnitPrice(
  product: { price: number; mixedLabelsSheetBundles?: MixedLabelsSheetBundle[] },
  customizations?: Record<string, string>
): number {
  return getStorefrontLinePriceBreakdown(product, customizations).unitPrice
}

/**
 * GST-inclusive unit price for cart, checkout, and server payment validation.
 * Mixed Labels: unit price = selected sheet bundle price (× cart quantity at checkout).
 */
export function getStorefrontLinePriceBreakdown(
  product: { price: number; mixedLabelsSheetBundles?: MixedLabelsSheetBundle[] },
  customizations?: Record<string, string>
): StorefrontLinePriceBreakdown {
  const bundle = resolveMixedLabelsSheetBundle(product, customizations)
  if (bundle) {
    return {
      unitPrice: bundle.price,
      baseUnitPrice: bundle.price,
      customizationSurchargePerUnit: 0,
      mixedLabelsBundle: bundle,
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
