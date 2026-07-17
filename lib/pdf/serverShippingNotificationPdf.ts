import { jsPDF } from 'jspdf'
import type { OrderRecord } from '@/lib/store'
import { COMPANY_CONTACT, COMPANY_LEGAL, getCompanyBrandName } from '@/lib/companyLegal'
import { resolveOrderShippingSnapshot } from '@/lib/shipping/shippingSnapshot'

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

  const writeKeyValue = (label: string, value: string, valueX = margin + 46) => {
    ensureSpace(7)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(75, 85, 99)
    doc.text(label, margin + 2, y)
    doc.setFont('helvetica', 'normal').setTextColor(17, 24, 39)
    const lines = doc.splitTextToSize(value || '-', contentWidth - (valueX - margin) - 4)
    doc.text(lines, valueX, y)
    y += Math.max(6, lines.length * 4.3)
  }

  const sectionTitle = (title: string) => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 24, 39)
    doc.text(title, margin, y)
    y += 6
  }

  const snap = resolveOrderShippingSnapshot(order)
  const tracking = order.tracking
  const trackingNumber = (tracking?.number || '').trim()
  const hasTracking = Boolean(trackingNumber)
  const trackingProvider = tracking?.provider || '-'
  const deliveryWindow =
    snap.shippingDeliveryTime && snap.shippingDeliveryTime !== '—'
      ? snap.shippingDeliveryTime
      : 'Usual delivery window for this service'
  const estimated = tracking?.estimatedDelivery
    ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : deliveryWindow
  const orderDate = order.createdAtIso
    ? new Date(order.createdAtIso).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-'
  const statusTextMap: Record<string, string> = {
    delivered: 'Delivered',
    out_for_delivery: 'Out for Delivery',
    in_transit: 'In Transit',
    pending: 'Pending',
    failed: 'Failed',
    returned: 'Returned',
  }
  const trackingStatus = hasTracking
    ? statusTextMap[String(tracking?.status || '').toLowerCase()] || 'In Transit'
    : snap.shippingType === 'pickup'
      ? 'Ready for collection'
      : 'Dispatched (untracked)'

  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(17, 24, 39)
  doc.text(getCompanyBrandName(COMPANY_LEGAL.companyName), margin + 4, y + 8)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(75, 85, 99)
  doc.text(`ABN: ${COMPANY_LEGAL.abn}   ACN: ${COMPANY_LEGAL.acn}`, margin + 4, y + 14)
  doc.text(`${COMPANY_CONTACT.address}`, margin + 4, y + 19)
  doc.text(`${COMPANY_CONTACT.phone}  |  ${COMPANY_CONTACT.email}`, margin + 4, y + 24)
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(22, 101, 52)
  doc.text(
    snap.shippingType === 'pickup' ? 'COLLECTION NOTICE' : 'SHIPPING NOTIFICATION',
    pageWidth - margin - 4,
    y + 10,
    { align: 'right' }
  )
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(55, 65, 81)
  doc.text(`Order ${order.id}`, pageWidth - margin - 4, y + 17, { align: 'right' })
  y += 36

  doc.setFillColor(hasTracking ? 236 : 255, hasTracking ? 253 : 247, hasTracking ? 245 : 237)
  doc.setDrawColor(hasTracking ? 34 : 180, hasTracking ? 197 : 83, hasTracking ? 94 : 9)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentWidth, hasTracking ? 24 : 28, 2, 2, 'FD')
  if (hasTracking) {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(75, 85, 99)
    doc.text('Tracking Number', margin + 3, y + 6)
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(21, 128, 61)
    doc.text(trackingNumber, margin + 3, y + 14)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(75, 85, 99)
    doc.text(`Shipping Provider: ${trackingProvider}`, margin + 3, y + 20)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 24, 39)
    doc.text(`Status: ${trackingStatus}`, pageWidth - margin - 4, y + 10, { align: 'right' })
    y += 30
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(75, 85, 99)
    doc.text(snap.shippingType === 'pickup' ? 'Collection' : 'Dispatch', margin + 3, y + 6)
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(146, 64, 14)
    doc.text(
      snap.shippingType === 'pickup'
        ? 'Click & Collect — no tracking'
        : 'No tracking included on this service',
      margin + 3,
      y + 14
    )
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(75, 85, 99)
    doc.text(`Service: ${snap.shippingOptionName}`, margin + 3, y + 21)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 24, 39)
    doc.text(`Status: ${trackingStatus}`, pageWidth - margin - 4, y + 10, { align: 'right' })
    y += 34
  }

  sectionTitle('Order Information')
  writeKeyValue('Order Number', order.id)
  writeKeyValue('Order Date', orderDate)
  writeKeyValue('Shipping Service', snap.shippingOptionName)
  writeKeyValue(
    snap.shippingType === 'pickup' ? 'Collection Window' : 'Estimated Delivery',
    estimated
  )
  if (hasTracking) {
    writeKeyValue('Track Online', shippingTrackUrl(tracking?.provider, trackingNumber))
  } else if (snap.shippingType !== 'pickup') {
    writeKeyValue('Tracking', 'Not included with this shipping option')
  }

  y += 3
  sectionTitle('Customer Information')
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
  if (address) writeKeyValue('Shipping Address', address)

  y += 3
  sectionTitle('Order Items')
  doc.setFillColor(249, 250, 251)
  doc.rect(margin, y - 4.5, contentWidth, 7, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(75, 85, 99)
  doc.text('Item', margin + 2, y)
  doc.text('Qty', pageWidth - margin - 4, y, { align: 'right' })
  y += 7

  for (const item of order.items || []) {
    ensureSpace(9)
    const name = String(item.name || 'Item').slice(0, 80)
    const qty = Number(item.quantity) || 0
    const lines = doc.splitTextToSize(name, contentWidth - 20)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(17, 24, 39)
    doc.text(lines, margin + 2, y)
    doc.text(`x${qty}`, pageWidth - margin - 4, y, { align: 'right' })
    y += Math.max(6, lines.length * 4.3)
    doc.setDrawColor(232, 232, 232)
    doc.line(margin, y - 2, margin + contentWidth, y - 2)
  }

  y += 4
  ensureSpace(18)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(75, 85, 99)
  doc.text(
    hasTracking
      ? 'Please contact us if you have any questions about delivery.'
      : 'Please allow the full delivery window before contacting us about a missing parcel.',
    margin,
    y
  )
  y += 5
  doc.text(
    `${getCompanyBrandName(COMPANY_LEGAL.companyName)} | ${COMPANY_CONTACT.email} | ${COMPANY_CONTACT.phone}`,
    margin,
    y
  )

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
