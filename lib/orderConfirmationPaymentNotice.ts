/**
 * Payment-specific copy for order confirmation emails and PDFs (English only).
 * Bank: pending until deposit verified. Stripe: receipt + internal processing.
 */

import {
  classifyOrderCatalogMix,
  orderConfirmationFulfillmentPhrase,
  type OrderCatalogMix,
} from './orderConfirmationCatalogMix'
import type { OrderItemSnapshot } from './store'

export type OrderPaymentMethod = 'card' | 'paypal' | 'bank' | 'cash' | 'stripe' | 'marketplace'

const MARKETPLACE = `Thank you for your order! This order was placed through an external marketplace (e.g. Etsy). Processing and shipping follow the same SELPIC workflow; you may also receive separate messages from the marketplace.`

function bankNotice(mix: OrderCatalogMix): string {
  const tail = orderConfirmationFulfillmentPhrase(mix)
  return `Thank you for your order! Your order status will remain "Pending" until we verify your bank transfer. This usually takes 1–2 business days depending on your bank. ${tail}`
}

function stripeNotice(mix: OrderCatalogMix): string {
  const tail = orderConfirmationFulfillmentPhrase(mix).replace(
    ' as soon as your payment is confirmed.',
    ' once your order is confirmed in our workflow (typically within one business day).'
  )
  return `Thank you for your order! Your payment was processed securely through Stripe. You will receive Stripe's receipt, and we may also send you separate messages from our business. Our team uses those notifications together with this confirmation to process your order — ${tail}`
}

function cardPaypalNotice(mix: OrderCatalogMix): string {
  const tail = orderConfirmationFulfillmentPhrase(mix)
  return `Thank you for your order! We have received your payment. Our team will process your order shortly. ${tail}`
}

function cashNotice(mix: OrderCatalogMix): string {
  const tail = orderConfirmationFulfillmentPhrase(mix).replace(
    ' as soon as your payment is confirmed.',
    ' after payment is received.'
  )
  return `Thank you for your order! Your order will remain pending until payment is collected on delivery. ${tail}`
}

export function getOrderConfirmationPaymentNotice(
  paymentMethod: string | undefined,
  mix: OrderCatalogMix = 'stickers_only'
): string {
  switch (paymentMethod as OrderPaymentMethod | undefined) {
    case 'bank':
      return bankNotice(mix)
    case 'stripe':
      return stripeNotice(mix)
    case 'marketplace':
      return MARKETPLACE
    case 'cash':
      return cashNotice(mix)
    case 'card':
    case 'paypal':
      return cardPaypalNotice(mix)
    default:
      return ''
  }
}

/** Resolve catalog mix from order lines when building payment copy. */
export function getOrderConfirmationPaymentNoticeForOrder(
  paymentMethod: string | undefined,
  items: OrderItemSnapshot[] | undefined
): string {
  const { mix } = classifyOrderCatalogMix(items)
  return getOrderConfirmationPaymentNotice(paymentMethod, mix)
}
