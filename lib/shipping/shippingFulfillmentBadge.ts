import type { OrderShippingReadable } from '@/lib/shipping/shippingSnapshot'
import { resolveOrderShippingSnapshot } from '@/lib/shipping/shippingSnapshot'

export type ShippingFulfillmentBadge = {
  key: 'untracked' | 'tracking_required' | 'tracking_added' | 'click_collect' | 'notified'
  label: string
  className: string
}

/**
 * Admin badge for how an order should be fulfilled / notified.
 */
export function getShippingFulfillmentBadge(order: OrderShippingReadable & {
  tracking?: { number?: string }
  shippingNotification?: { sent?: boolean }
}): ShippingFulfillmentBadge {
  const snap = resolveOrderShippingSnapshot(order)
  const hasNumber = Boolean((order.tracking?.number || '').trim())

  if (snap.shippingType === 'pickup') {
    if (order.shippingNotification?.sent) {
      return {
        key: 'notified',
        label: 'CLICK & COLLECT · NOTIFIED',
        className: 'bg-sky-100 text-sky-800 border-sky-200',
      }
    }
    return {
      key: 'click_collect',
      label: 'CLICK & COLLECT',
      className: 'bg-sky-100 text-sky-800 border-sky-200',
    }
  }

  if (snap.shippingTrackingIncluded) {
    if (hasNumber) {
      return {
        key: 'tracking_added',
        label: 'TRACKING ADDED',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      }
    }
    return {
      key: 'tracking_required',
      label: 'TRACKING REQUIRED',
      className: 'bg-amber-100 text-amber-900 border-amber-200',
    }
  }

  if (order.shippingNotification?.sent) {
    return {
      key: 'notified',
      label: 'UNTRACKED · NOTIFIED',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  }

  return {
    key: 'untracked',
    label: 'UNTRACKED',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }
}
