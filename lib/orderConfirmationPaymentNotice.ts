/**
 * Payment-specific copy for order confirmation emails and PDFs (English only).
 * Bank: pending until deposit verified. Stripe: receipt + internal processing.
 */

export type OrderPaymentMethod = 'card' | 'paypal' | 'bank' | 'cash' | 'stripe'

const BANK = `Thank you for your order! Your order status will remain "Pending" until we verify your bank transfer. This usually takes 1–2 business days depending on your bank. We will start creating your stickers as soon as the payment is confirmed.`

const STRIPE = `Thank you for your order! Your payment was processed securely through Stripe. You will receive Stripe's receipt, and we may also send you separate messages from our business. Our team uses those notifications together with this confirmation to process your order — we will start creating your stickers as soon as your order is confirmed in our workflow (typically within one business day).`

const CARD_PAYPAL = `Thank you for your order! We have received your payment. Our team will process your order shortly, and we will start creating your stickers once your payment is fully confirmed.`

const CASH = `Thank you for your order! Your order will remain pending until payment is collected on delivery. We will start creating your stickers after payment is received.`

export function getOrderConfirmationPaymentNotice(paymentMethod: string | undefined): string {
  switch (paymentMethod as OrderPaymentMethod | undefined) {
    case 'bank':
      return BANK
    case 'stripe':
      return STRIPE
    case 'cash':
      return CASH
    case 'card':
    case 'paypal':
      return CARD_PAYPAL
    default:
      return ''
  }
}
