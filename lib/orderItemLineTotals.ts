import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'
import { getMixedLabelsBundleUnitPrice } from '@/lib/mixedLabelsPricing'

/** Shape needed to compute displayed line amounts (email, receipts). */
export type OrderItemForLineTotals = {
  price: number
  quantity: number
  baseUnitPrice?: number
  customizationSurchargePerUnit?: number
  customizations: Record<string, string>
  size?: string
}

/**
 * New orders: `price` = base + surcharge per unit; optional fields document the split.
 * Legacy orders: `price` = catalogue unit only; surcharge is inferred from customizations.
 */
export function getOrderItemLineMoney(item: OrderItemForLineTotals): {
  baseUnit: number
  surchargeUnit: number
  lineTotal: number
} {
  const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0
  const mixedUnit = getMixedLabelsBundleUnitPrice({ price: item.price }, item.customizations)
  if (mixedUnit != null) {
    return {
      baseUnit: mixedUnit,
      surchargeUnit: 0,
      lineTotal: mixedUnit * qty,
    }
  }
  const surStored = item.customizationSurchargePerUnit
  const baseStored = item.baseUnitPrice

  if (baseStored !== undefined && surStored !== undefined) {
    const baseUnit = baseStored
    const surchargeUnit = surStored
    return {
      baseUnit,
      surchargeUnit,
      lineTotal: (baseUnit + surchargeUnit) * qty
    }
  }

  if (baseStored !== undefined && item.price >= baseStored) {
    const surchargeUnit = Math.max(0, item.price - baseStored)
    return {
      baseUnit: baseStored,
      surchargeUnit,
      lineTotal: item.price * qty
    }
  }

  const inferredSur = getCustomizationSurchargePerUnit(item.customizations, { size: item.size })
  const baseUnit = item.price
  const surchargeUnit = inferredSur
  return {
    baseUnit,
    surchargeUnit,
    lineTotal: (baseUnit + surchargeUnit) * qty
  }
}
