import { jsPDF } from 'jspdf'
import type { OrderRecord } from '@/lib/store'
import { COMPANY_CONTACT, COMPANY_LEGAL, getCompanyBrandName } from '@/lib/companyLegal'

function shippingTrackUrl(provider: string | undefined, trackingNumber: string): string {
  const p = (provider || '').toLowerCase()
  const t = encodeURIComponent(trackingNumber.trim())
  if (p.includes('aus') || p.includes('australia post') || p.includes('post')) {
    return `https://auspost.com.au/mypost/track/#/details/${t}`
  }
  return `https://www.google.com/search?q=${t}+tracking`
}

export function buildShippingNotificationPdfBase64(order: OrderRecord): string {
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
    const lines = doc.splitTextToSize(value || '-', contentWidth - 44)
    doc.text(lines, margin + 44, y)
    y += Math.max(6, lines.length * (size * 0.4 + 1))
  }

  const tracking = order.tracking
  const trackingNumber = tracking?.number || '-'
  const trackingProvider = tracking?.provider || '-'
  const estimated = tracking?.estimatedDelivery
    ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Please check tracking status'

  // Header
  doc.setFillColor(237, 251, 241)
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(getCompanyBrandName(COMPANY_LEGAL.companyName), margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(COMPANY_CONTACT.address, margin + 4, y + 14)
  doc.text(`${COMPANY_CONTACT.phone}  |  ${COMPANY_CONTACT.email}`, margin + 4, y + 19)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('SHIPPING NOTIFICATION', pageWidth - margin - 4, y + 10, { align: 'right' })
  doc.setFontSize(10)
  doc.text(order.id, pageWidth - margin - 4, y + 17, { align: 'right' })
  y += 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Tracking details', margin, y)
  y += 6
  writeKeyValue('Tracking number', trackingNumber)
  writeKeyValue('Carrier', trackingProvider)
  writeKeyValue('Estimated delivery', estimated)
  writeKeyValue('Track online', shippingTrackUrl(tracking?.provider, trackingNumber), 9)

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Customer details', margin, y)
  y += 6
  const c = order.customer
  const customerName =
    c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || 'Customer'
  writeKeyValue('Name', customerName)
  writeKeyValue('Email', c?.email || '-')
  if (c?.phone) writeKeyValue('Phone', c.phone)

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
  if (address) writeKeyValue('Shipping address', address, 9)

  y += 3
  ensureSpace(16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Items', margin, y)
  y += 6
  for (const item of order.items || []) {
    ensureSpace(9)
    const name = String(item.name || 'Item').slice(0, 80)
    const qty = Number(item.quantity) || 0
    const lines = doc.splitTextToSize(`${name} x${qty}`, contentWidth - 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(lines, margin + 2, y)
    y += Math.max(6, lines.length * 4.3)
    doc.setDrawColor(232, 232, 232)
    doc.line(margin, y - 2, margin + contentWidth, y - 2)
  }

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
