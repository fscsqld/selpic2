import type { OrderRecord } from '@/lib/store'
import { formatOrderShippingSummaryLines } from '@/lib/shipping/formatOrderShippingSummary'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Minimal receipt HTML for server-side sends when client PDF pipeline is unavailable. */
export function buildSimpleReceiptEmailHtml(order: OrderRecord): string {
  const rows =
    (order.items || [])
      .map((it) => {
        const name = esc(String(it.name || 'Item'))
        const qty = Number(it.quantity) || 0
        const price = Number(it.price) || 0
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${price.toFixed(2)}</td></tr>`
      })
      .join('') || '<tr><td colspan="3">No line items</td></tr>'

  const total = Number(order.total) || 0
  const id = esc(String(order.id || ''))
  const customer = esc(String(order.customer?.name || order.customer?.email || 'Customer'))
  const shippingHtml = formatOrderShippingSummaryLines(order)
    .map((line) => `<li>${esc(line)}</li>`)
    .join('')

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:640px">
    <h1 style="font-size:20px">Receipt</h1>
    <p>Order <strong>${id}</strong></p>
    <p>${customer}</p>
    <p style="margin-top:12px"><strong>Shipping</strong></p>
    <ul style="margin:4px 0 12px;padding-left:20px">${shippingHtml}</ul>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead><tr><th align="left" style="padding:8px;border-bottom:2px solid #ccc">Item</th><th align="right" style="padding:8px;border-bottom:2px solid #ccc">Qty</th><th align="right" style="padding:8px;border-bottom:2px solid #ccc">Price</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;font-size:18px"><strong>Total: $${total.toFixed(2)}</strong></p>
  </div>`
}

export function buildSimpleReceiptSubject(orderId: string): string {
  return `[Selpic] Receipt: ${orderId}`
}
