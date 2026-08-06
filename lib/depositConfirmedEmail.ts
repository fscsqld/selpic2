import type { OrderRecord } from '@/lib/store'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'
import {
  formatOrderShippingSummaryLines,
  formatOrderShippingSummaryPlain,
} from '@/lib/shipping/formatOrderShippingSummary'

/**
 * Email sent when admin confirms a bank-transfer deposit (Confirm Deposit → Paid).
 * Distinct from the initial order confirmation (which says payment is still pending).
 */

export function buildDepositConfirmedEmailSubject(orderId: string): string {
  return `[Selpic] Payment Confirmed: ${orderId} | Bank transfer received`
}

function formatMoney(n: number): string {
  return `$${Number(n).toFixed(2)}`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildOrderItemsLines(order: OrderRecord): string[] {
  const lines: string[] = []
  order.items.forEach((item, index) => {
    const { baseUnit, surchargeUnit } = getOrderItemLineMoney(item)
    const qty = item.quantity
    const baseTotal = baseUnit * qty
    const optionsTotal = surchargeUnit * qty
    const label =
      optionsTotal > 0.001 ? getCustomizationSurchargeLabel(item.customizations, { size: item.size }) : ''
    lines.push(`${index + 1}. ${item.name} × ${qty} — ${formatMoney(baseTotal)}`)
    if (optionsTotal > 0.001) {
      lines.push(`   + ${label} ${formatMoney(optionsTotal)}`)
    }
  })
  return lines
}

export function buildDepositConfirmedEmailPlainText(order: OrderRecord): string {
  const customerName = order.customer.name || order.customer.email.split('@')[0] || 'Customer'
  const orderDate = new Date(order.createdAtIso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const itemsBlock = buildOrderItemsLines(order).join('\n') || '(No line items)'
  const financialLines: string[] = [
    `Subtotal (GST incl.): ${formatMoney(order.subtotal)}`,
    `Shipping: ${formatMoney(order.shippingPrice)}`,
  ]
  if (order.discount && order.discount > 0) {
    financialLines.push(`Discount: -${formatMoney(order.discount)}`)
  }
  if (order.paymentFee && order.paymentFee > 0) {
    financialLines.push(`Payment fee: ${formatMoney(order.paymentFee)}`)
  }
  financialLines.push(`Total Amount: ${formatMoney(order.total)}`)
  const shippingSummary = formatOrderShippingSummaryPlain(order)

  return `Dear ${customerName},

Great news — we have confirmed your bank transfer for order ${order.id}.

Your payment has been received and your order status is now Paid. Our team will start creating your custom stickers shortly.

---
Order Summary:
- Order ID: ${order.id}
- Order Date: ${orderDate}
- Order Status: Paid
- Payment method: Bank transfer

Shipping:
${shippingSummary}

Order Items:
${itemsBlock}

Financial Summary:
${financialLines.map((line) => `- ${line}`).join('\n')}
---

If you have any questions, simply reply to this email or contact us at info@selpic.com.au.`
}

/** Main HTML content only; signature & confidentiality are added by emailService. */
export function buildDepositConfirmedEmailHtml(order: OrderRecord): string {
  const customerName = escHtml(order.customer.name || order.customer.email.split('@')[0] || 'Customer')
  const orderDate = escHtml(
    new Date(order.createdAtIso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  )

  const itemsHtml = order.items
    .map((item, index) => {
      const { baseUnit, surchargeUnit } = getOrderItemLineMoney(item)
      const qty = item.quantity
      const baseTotal = baseUnit * qty
      const optionsTotal = surchargeUnit * qty
      const label =
        optionsTotal > 0.001 ? getCustomizationSurchargeLabel(item.customizations, { size: item.size }) : ''
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
  financialRows += `<tr><td style="padding:8px 0;border-top:1px solid #ddd;">Total Amount:</td><td style="padding:8px 0;border-top:1px solid #ddd;text-align:right;"><strong>${formatMoney(order.total)}</strong></td></tr>`

  const shippingLinesHtml = formatOrderShippingSummaryLines(order)
    .map((line) => `<li>${escHtml(line)}</li>`)
    .join('')

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#111;max-width:600px;margin:0 auto;padding:16px;">
  <p style="margin:0 0 12px;">Dear ${customerName},</p>
  <p style="margin:0 0 12px;">Great news — we have <strong>confirmed your bank transfer</strong> for order <strong>${escHtml(order.id)}</strong>.</p>
  <p style="margin:0 0 12px;padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
    <strong style="color:#047857;">Payment confirmed</strong><br/>
    Your payment has been received and your order status is now <strong>Paid</strong>. Our team will start creating your custom stickers shortly.
  </p>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
  <p style="margin:0 0 8px;"><strong>Order Summary:</strong></p>
  <ul style="margin:0 0 16px;padding-left:20px;">
    <li>Order ID: ${escHtml(order.id)}</li>
    <li>Order Date: ${orderDate}</li>
    <li>Order Status: Paid</li>
    <li>Payment method: Bank transfer</li>
  </ul>
  <p style="margin:0 0 8px;"><strong>Shipping:</strong></p>
  <ul style="margin:0 0 16px;padding-left:20px;">${shippingLinesHtml}</ul>
  <p style="margin:0 0 8px;"><strong>Order Items:</strong></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${itemsHtml}</table>
  <p style="margin:0 0 8px;"><strong>Financial Summary:</strong></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${financialRows}</table>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
  <p style="margin:0;">If you have any questions, simply reply to this email or contact us at <a href="mailto:info@selpic.com.au" style="color:#4f46e5;">info@selpic.com.au</a>.</p>
</div>`
}
