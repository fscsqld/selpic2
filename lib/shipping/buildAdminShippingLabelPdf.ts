import { jsPDF } from 'jspdf'
import bwipjs from 'bwip-js/node'
import type { OrderRecord } from '@/lib/store'
import { formatOrderPersonalizationForLabel } from '@/lib/adminOrderListUtils'
import {
  computeDeclaredShippingWeightKg,
  formatDeclaredWeightForLabel,
} from '@/lib/shipping/orderDeclaredWeightKg'
import { getShippingLabelBarcodePayload } from '@/lib/shipping/shippingLabelBarcodePayload'

/** Fixed sender (production packing / AusPost-style layout). */
const SENDER_NAME = 'SELPIC'
const SENDER_ADDRESS_LINES = ['7 Harvest St', 'Mansfield QLD 4122'] as const

/** Service line on internal labels until live API selects a product. */
const INTERNAL_SERVICE_DISPLAY = 'Standard Letter'

const LABEL_X = 10
const LABEL_Y = 11
const LABEL_W = 190
/** Tall enough for recipient + capped personalization + barcode inside the frame. */
const LABEL_H = 132

function recipientDisplayName(order: OrderRecord): string {
  const c = order.customer
  const joined = [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim()
  return (c?.name?.trim() || joined || c?.email?.trim() || 'Customer').slice(0, 120)
}

function streetLine(order: OrderRecord): string {
  const a = order.address
  if (!a) return '—'
  const s = (a.streetAddress || '').trim()
  if (s) return s
  const single = (a.asSingleLine || '').trim()
  if (!single) return '—'
  const first = single.split(',').map((x) => x.trim()).filter(Boolean)[0]
  return first || single
}

function isAustralia(country: string): boolean {
  const c = country.trim().toLowerCase()
  return !c || c === 'au' || c === 'aus' || c === 'australia'
}

function itemsSummaryLine(order: OrderRecord, maxLen: number): string {
  const parts = (order.items || []).map((it) => `${String(it.name || 'Item').trim()} ×${it.quantity || 1}`)
  const s = parts.join(' · ')
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen - 1)}…`
}

function toCode128Payload(text: string): string {
  const t = text.replace(/[^\x20-\x7E]/g, '_').trim()
  return t.length > 0 ? t : '0'
}

/** Australia Post–style locality line: suburb, state, postcode clearly separated. */
function formatLocalityLine(order: OrderRecord): string {
  const a = order.address
  if (!a) return '—'
  const suburb = (a.suburb || '').trim()
  const state = (a.state || '').trim()
  const pc = (a.postcode || '').trim()
  if (suburb || state || pc) {
    return [suburb, state, pc].filter(Boolean).join('     ')
  }
  const tail = (a.asSingleLine || '').trim()
  return tail || '—'
}

/**
 * Production shipping label PDF (A4, single label panel). Code 128 encodes
 * {@link getShippingLabelBarcodePayload} (order id until AusPost tracking is stored).
 */
export async function buildAdminShippingLabelPdfBase64(order: OrderRecord): Promise<string> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const innerL = LABEL_X + 4
  const innerR = LABEL_X + LABEL_W - 4
  const innerW = innerR - innerL

  let y = LABEL_Y + 5

  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.35)
  doc.rect(LABEL_X, LABEL_Y, LABEL_W, LABEL_H, 'S')

  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(100, 116, 139)
  doc.text('FROM', innerL, y)
  y += 4.5

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 24, 39)
  doc.text(SENDER_NAME, innerL, y)
  y += 5
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(55, 65, 81)
  for (const line of SENDER_ADDRESS_LINES) {
    doc.text(line, innerL, y)
    y += 4.2
  }

  y += 2
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(innerL, y, innerR, y)
  y += 5

  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(100, 116, 139)
  doc.text('DELIVER TO', innerL, y)
  y += 5

  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(17, 24, 39)
  const nameLines = doc.splitTextToSize(recipientDisplayName(order), innerW)
  doc.text(nameLines, innerL, y)
  y += nameLines.length * 5.5 + 1

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(31, 41, 55)
  const stLines = doc.splitTextToSize(streetLine(order), innerW)
  doc.text(stLines, innerL, y)
  y += stLines.length * 4.6 + 3

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(17, 24, 39)
  const locality = formatLocalityLine(order)
  const locLines = doc.splitTextToSize(locality, innerW)
  doc.text(locLines, innerL, y)
  y += locLines.length * 5.2

  const addr = order.address
  const country = (addr?.country || '').trim()
  if (country && !isAustralia(country)) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105)
    doc.text(country, innerL, y)
    y += 4.5
  }

  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(71, 85, 105)
  const phone = (order.customer?.phone || '').trim()
  const email = (order.customer?.email || '').trim()
  if (phone) {
    doc.text(`Phone  ${phone}`, innerL, y)
    y += 3.8
  }
  if (email) {
    doc.text(`Email  ${email}`, innerL, y)
    y += 3.8
  }

  y += 2
  const pers = formatOrderPersonalizationForLabel(order)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  const persHead = 'PERSONALIZATION'
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(71, 85, 105)
  const persBodySize = 8
  const persAll = doc.splitTextToSize(pers, innerW - 4)
  const maxPersLines = 7
  const persLines =
    persAll.length > maxPersLines
      ? [...persAll.slice(0, maxPersLines - 1), `${persAll[maxPersLines - 1] ?? ''}…`]
      : persAll
  const lineH = 3.5
  const persBoxH = 6 + persLines.length * lineH + 4
  const persTop = y
  doc.roundedRect(innerL, persTop - 2, innerW, persBoxH, 1, 1, 'FD')
  doc.text(persHead, innerL + 2, persTop + 2.5)
  doc.setFont('helvetica', 'normal').setFontSize(persBodySize).setTextColor(17, 24, 39)
  doc.text(persLines, innerL + 2, persTop + 6.5)
  y = persTop + persBoxH + 3

  const weightKg = computeDeclaredShippingWeightKg(order)
  const weightStr = formatDeclaredWeightForLabel(weightKg)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(55, 65, 81)
  doc.text(`Service: ${INTERNAL_SERVICE_DISPLAY}     Weight: ${weightStr}`, innerL, y)
  y += 4
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(100, 116, 139)
  const itemLine = itemsSummaryLine(order, 220)
  const itemWrapped = doc.splitTextToSize(`Items: ${itemLine}`, innerW)
  doc.text(itemWrapped, innerL, y)
  y += itemWrapped.length * 3.6 + 2

  const barcodeReserved = 26
  const barcodeY = Math.max(y + 2, LABEL_Y + LABEL_H - barcodeReserved)
  const barcodeText = toCode128Payload(getShippingLabelBarcodePayload(order))
  const png: Buffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: barcodeText,
    scale: 2,
    height: 11,
    includetext: true,
    textfont: 'Helvetica',
    textsize: 8,
    textxalign: 'center',
    barcolor: '000000',
    textcolor: '000000',
  })
  const imgData = `data:image/png;base64,${png.toString('base64')}`
  const barW = Math.min(innerW - 8, 92)
  const barH = Math.min(18, Math.max(12, LABEL_Y + LABEL_H - barcodeY - 10))
  const barX = innerL + (innerW - barW) / 2
  try {
    doc.addImage(imgData, 'PNG', barX, barcodeY, barW, barH)
  } catch {
    doc.setFont('courier', 'normal').setFontSize(8).setTextColor(17, 24, 39)
    doc.text(barcodeText, innerL, barcodeY + 6)
  }

  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(100, 116, 139)
  const noteY = Math.min(barcodeY + barH + 3.5, LABEL_Y + LABEL_H - 4)
  doc.text(
    'Barcode: internal reference (order id or stored tracking). Replace with AusPost article id when Digital API is connected.',
    innerL,
    noteY,
    { maxWidth: innerW }
  )

  const metaY = LABEL_Y + LABEL_H + 6
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(148, 163, 184)
  const created = order.createdAtIso
    ? new Date(order.createdAtIso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  doc.text(`Order ${order.id}  ·  ${created}`, innerL, metaY)

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
