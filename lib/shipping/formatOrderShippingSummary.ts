import type { OrderRecord } from '@/lib/store'
import { resolveOrderShippingSnapshot } from '@/lib/shipping/shippingSnapshot'

/** Customer-facing shipping lines for confirmation / receipt emails. */
export function formatOrderShippingSummaryLines(order: OrderRecord): string[] {
  const snap = resolveOrderShippingSnapshot(order)
  const lines: string[] = [`Service: ${snap.shippingOptionName}`]

  if (snap.shippingType === 'pickup') {
    lines.push('Type: Click & Collect (no shipping / no tracking)')
  } else if (snap.shippingTrackingIncluded) {
    lines.push('Tracking: Included with this option')
  } else {
    lines.push('Tracking: Not included (standard untracked delivery)')
  }

  if (snap.shippingDeliveryTime && snap.shippingDeliveryTime !== '—') {
    lines.push(
      snap.shippingType === 'pickup'
        ? `Collection: ${snap.shippingDeliveryTime}`
        : `Delivery window: ${snap.shippingDeliveryTime}`
    )
  }

  lines.push(`Shipping charged: $${Number(snap.shippingPrice || 0).toFixed(2)}`)
  return lines
}

export function formatOrderShippingSummaryPlain(order: OrderRecord): string {
  return formatOrderShippingSummaryLines(order)
    .map((line) => `- ${line}`)
    .join('\n')
}
