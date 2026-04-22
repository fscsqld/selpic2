import type { OrderRecord } from '@/lib/store'
import { jsPDF } from 'jspdf'

/**
 * Server-only receipt PDF (Stripe / guest checkout / customer receipt email).
 * Uses jsPDF default font (Latin). Non-Latin characters in item names may be omitted or shown as gaps.
 */
export function buildOrderReceiptPdfBase64(order: OrderRecord): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  const addLine = (text: string, size = 10) => {
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, 180)
    for (const line of lines) {
      if (y > 285) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += size * 0.45 + 1
    }
  }

  doc.setFontSize(16)
  doc.text('Selpic — Order receipt', margin, y)
  y += 10

  addLine(`Order: ${order.id}`, 10)
  const c = order.customer
  const custName = c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || 'Customer'
  addLine(`Customer: ${custName}`, 10)
  addLine(`Email: ${c?.email || ''}`, 10)
  if (c?.phone) addLine(`Phone: ${c.phone}`, 10)

  const addr = order.address
  if (addr) {
    const line =
      addr.asSingleLine ||
      [addr.streetAddress, addr.suburb, addr.state, addr.postcode, addr.country].filter(Boolean).join(', ')
    if (line) addLine(`Address: ${line}`, 9)
  }

  y += 3
  addLine('Line items', 11)
  for (const it of order.items || []) {
    const name = String(it.name || 'Item').slice(0, 80)
    const qty = Number(it.quantity) || 0
    const price = Number(it.price) || 0
    const lineTotal = price * qty
    addLine(`${name}  ×${qty}  @ $${price.toFixed(2)}  = $${lineTotal.toFixed(2)}`, 9)
  }

  y += 2
  addLine(`Subtotal: $${(Number(order.subtotal) || 0).toFixed(2)}`, 10)
  addLine(`Shipping: $${(Number(order.shippingPrice) || 0).toFixed(2)}`, 10)
  if (order.discount && order.discount > 0) {
    addLine(`Discount: -$${Number(order.discount).toFixed(2)}`, 10)
  }
  doc.setFontSize(12)
  if (y > 278) {
    doc.addPage()
    y = margin
  }
  doc.text(`Total: $${(Number(order.total) || 0).toFixed(2)}`, margin, y)
  y += 8

  doc.setFontSize(9)
  addLine(`Payment: ${order.paymentMethod || 'N/A'}`, 9)
  if (order.createdAtIso) {
    try {
      addLine(`Order date: ${new Date(order.createdAtIso).toLocaleString('en-AU')}`, 9)
    } catch {
      /* ignore */
    }
  }

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
