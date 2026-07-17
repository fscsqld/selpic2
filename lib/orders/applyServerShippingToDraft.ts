import type { OrderRecord } from '@/lib/store'
import { findActiveShippingOption } from '@/lib/server/cmsShippingConfig'
import { computeChargedShippingPrice } from '@/lib/shipping/computeChargedShippingPrice'
import { buildOrderShippingSnapshot } from '@/lib/shipping/shippingSnapshot'
import {
  getCartShippingRequirement,
  isShippingOptionCompatible,
} from '@/lib/shipping/productShippingEligibility'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

/**
 * Re-validate shipping option against CMS and overwrite draft shipping fields
 * (name, tracking flags, charged price). Recalculates `total` to stay consistent.
 */
export async function applyServerShippingToDraft(orderDraft: OrderDraft): Promise<OrderDraft> {
  const optionId = String(orderDraft.shippingOptionId || '').trim()
  if (!optionId) {
    throw new Error('Please select a shipping option.')
  }

  const found = await findActiveShippingOption(optionId)
  if (!found) {
    throw new Error('Selected shipping option is not available.')
  }

  const { option, freeShippingSettings, vipFreeShippingByGrade } = found
  const shippingRequirement = getCartShippingRequirement(
    (orderDraft.items || []).map((item) => ({
      product: {
        category: item.category,
        shippingClass: item.shippingClass,
        shippingWeightGrams:
          item.shippingWeightGrams ||
          (Number(item.weightKg) > 0 ? Number(item.weightKg) * 1000 : undefined),
      },
      quantity: item.quantity,
    }))
  )
  if (!isShippingOptionCompatible(option, shippingRequirement.requiresParcel)) {
    throw new Error(
      `Selected shipping option is not suitable for this cart. Parcel service is required (estimated packed weight: ${shippingRequirement.totalWeightGrams} g).`
    )
  }

  const itemsSubtotal = Number(orderDraft.subtotal) || 0
  const vipGrade =
    orderDraft.vipGradeCode !== undefined && orderDraft.vipGradeCode !== null
      ? Number(orderDraft.vipGradeCode)
      : NaN
  const vipFreeShipping =
    Number.isFinite(vipGrade) && Boolean(vipFreeShippingByGrade[vipGrade])

  const charged = computeChargedShippingPrice(
    option,
    itemsSubtotal,
    freeShippingSettings,
    vipFreeShipping
  )
  const snapshot = buildOrderShippingSnapshot(option, charged)

  const fee = Math.max(0, Number(orderDraft.paymentFee) || 0)
  const discount = Math.max(0, Number(orderDraft.discount) || 0)
  const total = Math.max(0, itemsSubtotal + charged + fee - discount)

  const clientShipCents = audCents(orderDraft.shippingPrice)
  const serverShipCents = audCents(charged)
  if (Math.abs(clientShipCents - serverShipCents) > 1) {
    throw new Error(
      `Shipping price mismatch for ${option.name}. Please refresh checkout and try again.`
    )
  }

  return {
    ...orderDraft,
    ...snapshot,
    total: Number(total.toFixed(2)),
  }
}
