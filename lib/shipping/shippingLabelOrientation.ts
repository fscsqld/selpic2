/**
 * Avery L7169 label content orientation (same physical stock).
 * Portrait = current draw. Landscape = content rotated in the same die-cut cell.
 */

export type ShippingLabelOrientation = 'portrait' | 'landscape'

export function normalizeShippingLabelOrientation(value: unknown): ShippingLabelOrientation {
  return value === 'landscape' ? 'landscape' : 'portrait'
}

export function resolveShippingLabelOrientation(order: {
  shippingLabelOrientation?: ShippingLabelOrientation | null
}): ShippingLabelOrientation {
  return normalizeShippingLabelOrientation(order.shippingLabelOrientation)
}
