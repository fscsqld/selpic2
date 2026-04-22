import type { OrderRecord } from '@/lib/store'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'
import { getTransactionalEmailSiteOrigin } from '@/lib/transactionalEmailBranding'

/** @deprecated use getTransactionalEmailSiteOrigin */
export const getEmailSiteOrigin = getTransactionalEmailSiteOrigin

export { DEFAULT_PUBLIC_SITE_URL } from '@/lib/transactionalEmailBranding'

export function buildOrderConfirmationEmailSubject(orderId: string): string {
  return `[Selpic] Order Confirmed: ${orderId} | Thank you for your business!`
}

function formatMoney(n: number): string {
  return `$${Number(n).toFixed(2)}`
}

function orderStatusLabel(order: OrderRecord): string {
  switch (order.status) {
    case 'pending':
      return 'Pending Payment'
    case 'paid':
      return 'Paid'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'Shipped'
    case 'cancelled':
      return 'Cancelled'
    case 'approved':
      return 'Approved'
    default:
      return String(order.status || 'Pending Payment')
  }
}

function buildOrderItemsLines(order: OrderRecord): string[] {
  const lines: string[] = []
  order.items.forEach((item, index) => {
    const { baseUnit, surchargeUnit } = getOrderItemLineMoney(item)
    const qty = item.quantity
    const baseTotal = baseUnit * qty
    const optionsTotal = surchargeUnit * qty
    const label = optionsTotal > 0.001 ? getCustomizationSurchargeLabel(item.customizations, { size: item.size }) : ''
    lines.push(`${index + 1}. ${item.name} × ${qty} — ${formatMoney(baseTotal)}`)
    if (optionsTotal > 0.001) {
      lines.push(`   + ${label} ${formatMoney(optionsTotal)}`)
    }
  })
  return lines
}

/** Plain-text body (also used as the fallback / preheader-friendly copy). */
export function buildOrderConfirmationEmailPlainText(order: OrderRecord): string {
  const customerName = order.customer.name || order.customer.email.split('@')[0] || 'Customer'
  const orderDate = new Date(order.createdAtIso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  const itemsLines = buildOrderItemsLines(order)
  const itemsBlock = itemsLines.length > 0 ? itemsLines.join('\n') : '(No line items)'

  const financialLines: string[] = [
    `Subtotal (GST incl.): ${formatMoney(order.subtotal)}`,
    `Shipping: ${formatMoney(order.shippingPrice)}`
  ]
  if (order.discount && order.discount > 0) {
    financialLines.push(`Discount: -${formatMoney(order.discount)}`)
  }
  if (order.paymentFee && order.paymentFee > 0) {
    financialLines.push(`Payment fee: ${formatMoney(order.paymentFee)}`)
  }
  financialLines.push(`Total Amount: ${formatMoney(order.total)}`)
  const financialBlock = financialLines.map((line) => `- ${line}`).join('\n')

  return `Dear ${customerName},

Thank you for choosing Selpic. We've received your order and are excited to start creating your custom stickers!

[Action Required: Payment Verification]
Your order status is currently 'Pending'. If you have chosen Bank Transfer, please ensure the payment is completed. We will begin processing and production as soon as your funds are cleared (usually 1–2 business days).

---
Order Summary:
- Order ID: ${order.id}
- Order Date: ${orderDate}
- Order Status: ${orderStatusLabel(order)}

Order Items:
${itemsBlock}

Financial Summary:
${financialBlock}
---

If you have any questions, simply reply to this email or contact us at info@selpic.com.au.`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Main HTML content only; signature & confidentiality are added by emailService (transactional branding). */
export function buildOrderConfirmationEmailHtml(order: OrderRecord): string {
  const customerName = escHtml(order.customer.name || order.customer.email.split('@')[0] || 'Customer')
  const orderDate = escHtml(
    new Date(order.createdAtIso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  )
  const statusLabel = escHtml(orderStatusLabel(order))

  const itemsHtml = order.items
    .map((item, index) => {
      const { baseUnit, surchargeUnit } = getOrderItemLineMoney(item)
      const qty = item.quantity
      const baseTotal = baseUnit * qty
      const optionsTotal = surchargeUnit * qty
      const label = optionsTotal > 0.001 ? getCustomizationSurchargeLabel(item.customizations, { size: item.size }) : ''
      let block = `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;"><strong>${index + 1}.</strong> ${escHtml(item.name)} <span style="color:#555;">× ${qty}</span> — <strong>${formatMoney(baseTotal)}</strong>`
      if (optionsTotal > 0.001) {
        block += `<br/><span style="font-size:12px;color:#666;">+ ${escHtml(label)} ${formatMoney(optionsTotal)}</span>`
      }
      block += '</td></tr>'
      return block
    })
    .join('')

  let financialRows = `
    <tr><td style="padding:4px 0;">Subtotal (GST incl.):</td><td style="padding:4px 0;text-align:right;"><strong>${formatMoney(order.subtotal)}</strong></td></tr>
    <tr><td style="padding:4px 0;">Shipping:</td><td style="padding:4px 0;text-align:right;"><strong>${formatMoney(order.shippingPrice)}</strong></td></tr>`
  if (order.discount && order.discount > 0) {
    financialRows += `<tr><td style="padding:4px 0;">Discount:</td><td style="padding:4px 0;text-align:right;color:#15803d;">-${formatMoney(order.discount)}</td></tr>`
  }
  if (order.paymentFee && order.paymentFee > 0) {
    financialRows += `<tr><td style="padding:4px 0;">Payment fee:</td><td style="padding:4px 0;text-align:right;"><strong>${formatMoney(order.paymentFee)}</strong></td></tr>`
  }
  financialRows += `<tr><td style="padding:8px 0 0;border-top:1px solid #ddd;"><strong>Total Amount:</strong></td><td style="padding:8px 0 0;border-top:1px solid #ddd;text-align:right;"><strong>${formatMoney(order.total)}</strong></td></tr>`

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#111;max-width:600px;margin:0 auto;padding:16px;">
  <p style="margin:0 0 12px;">Dear ${customerName},</p>
  <p style="margin:0 0 12px;">Thank you for choosing Selpic. We've received your order and are excited to start creating your custom stickers!</p>
  <p style="margin:0 0 12px;"><strong>[Action Required: Payment Verification]</strong><br/>
  Your order status is currently 'Pending'. If you have chosen Bank Transfer, please ensure the payment is completed. We will begin processing and production as soon as your funds are cleared (usually 1–2 business days).</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
  <p style="margin:0 0 8px;"><strong>Order Summary:</strong></p>
  <ul style="margin:0 0 16px;padding-left:20px;">
    <li>Order ID: ${escHtml(order.id)}</li>
    <li>Order Date: ${orderDate}</li>
    <li>Order Status: ${statusLabel}</li>
  </ul>
  <p style="margin:0 0 8px;"><strong>Order Items:</strong></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${itemsHtml}</table>
  <p style="margin:0 0 8px;"><strong>Financial Summary:</strong></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${financialRows}</table>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
  <p style="margin:0;">If you have any questions, simply reply to this email or contact us at <a href="mailto:info@selpic.com.au" style="color:#4f46e5;">info@selpic.com.au</a>.</p>
</div>`
}
