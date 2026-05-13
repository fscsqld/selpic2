import type { OrderRecord } from '@/lib/store'

/**
 * Value encoded in the Code 128 barcode on internal labels.
 * Prefer AusPost article / tracking when `ausPostShippingLabel.trackingNumber` is set (live API later);
 * otherwise the internal order id.
 */
export function getShippingLabelBarcodePayload(order: OrderRecord): string {
  const fromMeta = order.ausPostShippingLabel?.trackingNumber?.trim()
  if (fromMeta) return fromMeta
  return order.id
}
