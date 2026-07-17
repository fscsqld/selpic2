import type { OrderRecord } from '@/lib/store'
import { sendEmailViaResendServer, type ResendAttachmentInput } from '@/lib/email/resendServer'
import { buildShippingNotificationPdfBase64 } from '@/lib/pdf/serverShippingNotificationPdf'
import {
  orderRequiresTrackingNumber,
  resolveOrderShippingSnapshot,
} from '@/lib/shipping/shippingSnapshot'

export type ShippingNotificationSendResult =
  | { ok: true; sentAt: string }
  | { ok: false; error: 'INVALID_RECIPIENT' | 'NO_TRACKING' | 'SEND_FAILED' }

function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shippingTrackUrl(provider: string | undefined, trackingNumber: string): string {
  const p = (provider || '').toLowerCase()
  const t = encodeURIComponent(trackingNumber.trim())
  if (p.includes('aus') || p.includes('australia post') || p.includes('post')) {
    return `https://auspost.com.au/mypost/track/#/details/${t}`
  }
  return `https://www.google.com/search?q=${t}+tracking`
}

function pdfAttachment(order: OrderRecord): ResendAttachmentInput | null {
  try {
    const content = buildShippingNotificationPdfBase64(order)
    if (!content) return null
    return {
      filename: `Shipping-Notification-${order.id}.pdf`,
      content,
      contentType: 'application/pdf',
    }
  } catch (error) {
    console.error('[shippingNotificationEmail] PDF generation failed:', error)
    return null
  }
}

/**
 * Server-only delivery notification sender.
 * Authorization and ledger deduplication are responsibilities of the caller.
 */
export async function sendShippingNotificationEmailForOrder(
  order: OrderRecord,
  recipientEmail?: string
): Promise<ShippingNotificationSendResult> {
  const to = (recipientEmail || order.customer?.email || '').trim()
  if (!to || !to.includes('@')) return { ok: false, error: 'INVALID_RECIPIENT' }

  const snap = resolveOrderShippingSnapshot(order)
  const trackingNumber = (order.tracking?.number || '').trim()
  if (orderRequiresTrackingNumber(order) && !trackingNumber) {
    return { ok: false, error: 'NO_TRACKING' }
  }

  const orderId = escHtml(order.id)
  const serviceName = escHtml(snap.shippingOptionName || 'Standard Letter')
  const tracking = order.tracking
  const deliveryWindow =
    snap.shippingDeliveryTime && snap.shippingDeliveryTime !== '—'
      ? escHtml(snap.shippingDeliveryTime)
      : 'the usual delivery window for this service'
  const estimated = tracking?.estimatedDelivery
    ? escHtml(
        new Date(tracking.estimatedDelivery).toLocaleDateString('en-AU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      )
    : deliveryWindow

  let html: string
  if (snap.shippingType === 'pickup') {
    html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
    <h1 style="font-size:20px">Order Ready for Collection</h1>
    <p>Your order <strong>${orderId}</strong> is ready for Click &amp; Collect.</p>
    <p><strong>Service:</strong> ${serviceName}</p>
    <p>Please collect during store business hours. Bring your order number.</p>
  </div>`
  } else if (trackingNumber) {
    const safeTrackingNumber = escHtml(trackingNumber)
    html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
    <h1 style="font-size:20px">Shipping Notification</h1>
    <p>Your order <strong>${orderId}</strong> is on its way.</p>
    <p><strong>Service:</strong> ${serviceName}</p>
    <p><strong>Tracking Number:</strong> ${safeTrackingNumber}</p>
    <p><strong>Shipping Provider:</strong> ${escHtml(tracking?.provider || 'Carrier')}</p>
    <p><strong>Estimated Delivery:</strong> ${estimated}</p>
    <p><a href="${shippingTrackUrl(tracking?.provider, trackingNumber)}">Track your shipment</a></p>
  </div>`
  } else {
    html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
    <h1 style="font-size:20px">Shipping Notification</h1>
    <p>Your order <strong>${orderId}</strong> has been dispatched via <strong>${serviceName}</strong>.</p>
    <p><strong>Tracking:</strong> This service does not include tracking.</p>
    <p><strong>Estimated delivery:</strong> ${estimated}</p>
    <p>Please allow the full delivery window before contacting us about a missing parcel.</p>
  </div>`
  }

  const pdf = pdfAttachment(order)
  const result = await sendEmailViaResendServer({
    to,
    subject:
      snap.shippingType === 'pickup'
        ? `Ready for Collection - Order #${order.id}`
        : `Shipping Notification - Order #${order.id}`,
    html,
    ...(pdf ? { attachments: [pdf] } : {}),
  })
  if (!result.ok) {
    console.error('[shippingNotificationEmail]', result.logMessage)
    return { ok: false, error: 'SEND_FAILED' }
  }
  return { ok: true, sentAt: new Date().toISOString() }
}
