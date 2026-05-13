import type { OrderRecord } from '@/lib/store'

/** Keep indexed columns in sync with canonical `payload` for filtering + marketplace dedupe. */
export function buildOrdersTableUpdate(order: OrderRecord): {
  payload: OrderRecord
  platform_source: string
  external_order_key: string | null
  stripe_checkout_session_id: string | null
} {
  return {
    payload: order,
    platform_source: order.platformSource || 'website',
    external_order_key: order.externalOrderKey?.trim() || null,
    stripe_checkout_session_id: order.stripeCheckoutSessionId?.trim() || null,
  }
}
