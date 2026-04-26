import type { OrderRecord } from '@/lib/store'
import { jsPDF } from 'jspdf'
import { COMPANY_CONTACT, COMPANY_LEGAL, getCompanyBrandName } from '@/lib/companyLegal'

/**
 * Server-only receipt PDF (Stripe / guest checkout / customer receipt email).
 * Uses jsPDF default font (Latin). Non-Latin characters in item names may be omitted or shown as gaps.
 */
export function buildOrderReceiptPdfBase64(order: OrderRecord): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (need = 8) => {
    if (y + need <= 285) return
    doc.addPage()
    y = margin
  }

  const writeKeyValue = (label: string, value: string, size = 10) => {
    ensureSpace(7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(value || '-', contentWidth - 36)
    doc.text(lines, margin + 36, y)
    y += Math.max(6, lines.length * (size * 0.4 + 1))
  }

  const aud = (v: number) => `$${(Number(v) || 0).toFixed(2)}`

  const c = order.customer
  const customerName =
    c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || 'Customer'
  const address =
    order.address?.asSingleLine ||
    [
      order.address?.streetAddress,
      order.address?.suburb,
      order.address?.state,
      order.address?.postcode,
      order.address?.country,
    ]
      .filter(Boolean)
      .join(', ')

  // Header block (brand style closer to dashboard documents).
  doc.setFillColor(244, 247, 255)
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(getCompanyBrandName(COMPANY_LEGAL.companyName), margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(COMPANY_CONTACT.address, margin + 4, y + 14)
  doc.text(`${COMPANY_CONTACT.phone}  |  ${COMPANY_CONTACT.email}`, margin + 4, y + 19)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('ORDER RECEIPT', pageWidth - margin - 4, y + 10, { align: 'right' })
  doc.setFontSize(10)
  doc.text(order.id, pageWidth - margin - 4, y + 17, { align: 'right' })
  y += 34

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Customer details', margin, y)
  y += 6
  writeKeyValue('Name', customerName)
  writeKeyValue('Email', c?.email || '-')
  if (c?.phone) writeKeyValue('Phone', c.phone)
  if (address) writeKeyValue('Address', address, 9)

  y += 3
  ensureSpace(16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Line items', margin, y)
  y += 6

  // Table header
  doc.setFillColor(248, 248, 248)
  doc.rect(margin, y - 4.5, contentWidth, 7, 'F')
  doc.setFontSize(9)
  doc.text('Item', margin + 2, y)
  doc.text('Qty', margin + 114, y, { align: 'right' })
  doc.text('Unit', margin + 142, y, { align: 'right' })
  doc.text('Total', margin + 176, y, { align: 'right' })
  y += 7

  for (const it of order.items || []) {
    ensureSpace(9)
    const name = String(it.name || 'Item').slice(0, 80)
    const qty = Number(it.quantity) || 0
    const unit = Number(it.price) || 0
    const lineTotal = unit * qty
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(name, 104)
    doc.text(wrapped, margin + 2, y)
    doc.text(String(qty), margin + 114, y, { align: 'right' })
    doc.text(aud(unit), margin + 142, y, { align: 'right' })
    doc.text(aud(lineTotal), margin + 176, y, { align: 'right' })
    const rowHeight = Math.max(6, wrapped.length * 4.3)
    y += rowHeight
    doc.setDrawColor(232, 232, 232)
    doc.line(margin, y - 2, margin + contentWidth, y - 2)
  }

  y += 2
  ensureSpace(34)
  const rightX = pageWidth - margin - 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Subtotal: ${aud(Number(order.subtotal) || 0)}`, rightX, y, { align: 'right' })
  y += 6
  doc.text(`Shipping: ${aud(Number(order.shippingPrice) || 0)}`, rightX, y, { align: 'right' })
  y += 6
  if (order.discount && order.discount > 0) {
    doc.text(`Discount: -${aud(Number(order.discount))}`, rightX, y, { align: 'right' })
    y += 6
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Total: ${aud(Number(order.total) || 0)}`, rightX, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  writeKeyValue('Payment', order.paymentMethod || 'N/A', 9)
  if (order.createdAtIso) {
    try {
      writeKeyValue('Order date', new Date(order.createdAtIso).toLocaleString('en-AU'), 9)
    } catch {
      /* ignore */
    }
  }

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
