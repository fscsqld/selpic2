/**
 * Shipping choice snapshot stored on each order at checkout.
 * Prefer these fields over re-deriving from live contentStore options
 * (admin may edit options later; paid orders must keep the customer's choice).
 */

export type ShippingServiceType = 'delivery' | 'pickup' | 'cash-on-delivery'

export type ShippingOptionLike = {
  id: string
  name: string
  price: number
  deliveryTime?: string
  tracking?: boolean
  insurance?: boolean
  type?: ShippingServiceType
}

/** Fields persisted on OrderRecord for fulfillment and emails. */
export type OrderShippingSnapshotFields = {
  shippingOptionId: string
  shippingOptionName: string
  /** Amount charged on this order (after free-shipping / VIP rules). */
  shippingPrice: number
  /** Catalog list price of the option before threshold/VIP adjustments. */
  shippingBasePrice: number
  shippingTrackingIncluded: boolean
  shippingInsuranceIncluded: boolean
  shippingType: ShippingServiceType
  shippingDeliveryTime: string
}

export function buildOrderShippingSnapshot(
  option: ShippingOptionLike,
  chargedPrice: number
): OrderShippingSnapshotFields {
  const base = Number(option.price)
  const charged = Number(chargedPrice)
  return {
    shippingOptionId: String(option.id || '').trim() || 'unknown',
    shippingOptionName: String(option.name || '').trim() || option.id || 'Shipping',
    shippingPrice: Number.isFinite(charged) ? Number(charged.toFixed(2)) : 0,
    shippingBasePrice: Number.isFinite(base) ? Number(base.toFixed(2)) : 0,
    shippingTrackingIncluded: Boolean(option.tracking),
    shippingInsuranceIncluded: Boolean(option.insurance),
    shippingType: option.type || 'delivery',
    shippingDeliveryTime: String(option.deliveryTime || '').trim() || '—',
  }
}

/** Known storefront ids when legacy orders lack snapshot flags. */
const LEGACY_TRACKING_BY_ID: Record<string, boolean> = {
  'standard-letter': false,
  'tracked-letter': true,
  'express-post': true,
  'parcel-post': true,
  'local-pickup': false,
  'click-collect-mansfield': false,
  'etsy-shipping': false,
}

const LEGACY_TYPE_BY_ID: Record<string, ShippingServiceType> = {
  'local-pickup': 'pickup',
  'click-collect-mansfield': 'pickup',
}

export type OrderShippingReadable = {
  shippingOptionId?: string
  shippingOptionName?: string
  shippingPrice?: number
  shippingBasePrice?: number
  shippingTrackingIncluded?: boolean
  shippingInsuranceIncluded?: boolean
  shippingType?: ShippingServiceType
  shippingDeliveryTime?: string
}

/**
 * Read snapshot from an order, with safe fallbacks for pre-snapshot ledger rows.
 */
export function resolveOrderShippingSnapshot(order: OrderShippingReadable): OrderShippingSnapshotFields {
  const id = String(order.shippingOptionId || '').trim() || 'unknown'
  const name = String(order.shippingOptionName || '').trim() || id
  const charged = Number(order.shippingPrice)
  const baseRaw = order.shippingBasePrice
  const base =
    baseRaw !== undefined && Number.isFinite(Number(baseRaw)) ? Number(baseRaw) : charged

  const tracking =
    typeof order.shippingTrackingIncluded === 'boolean'
      ? order.shippingTrackingIncluded
      : LEGACY_TRACKING_BY_ID[id] ?? /track|express|parcel/i.test(name)

  const insurance =
    typeof order.shippingInsuranceIncluded === 'boolean'
      ? order.shippingInsuranceIncluded
      : /express/i.test(id) || /express/i.test(name)

  const type: ShippingServiceType =
    order.shippingType ||
    LEGACY_TYPE_BY_ID[id] ||
    (/click\s*&?\s*collect|pickup|local-pickup/i.test(`${id} ${name}`) ? 'pickup' : 'delivery')

  return {
    shippingOptionId: id,
    shippingOptionName: name,
    shippingPrice: Number.isFinite(charged) ? Number(charged.toFixed(2)) : 0,
    shippingBasePrice: Number.isFinite(base) ? Number(base.toFixed(2)) : 0,
    shippingTrackingIncluded: tracking,
    shippingInsuranceIncluded: insurance,
    shippingType: type,
    shippingDeliveryTime: String(order.shippingDeliveryTime || '').trim() || '—',
  }
}

export function orderRequiresTrackingNumber(order: OrderShippingReadable): boolean {
  const snap = resolveOrderShippingSnapshot(order)
  return snap.shippingType === 'delivery' && snap.shippingTrackingIncluded
}

/** True for Click & Collect / local pickup (including legacy option ids). */
export function isOrderClickAndCollect(order: OrderShippingReadable): boolean {
  return resolveOrderShippingSnapshot(order).shippingType === 'pickup'
}
