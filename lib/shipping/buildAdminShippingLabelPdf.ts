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

/**
 * Australia Post common thermal label size (100 × 150 mm / ~4×6").
 * Page = full label; content uses a small inner margin for printers.
 */
export const AUSPOST_LABEL_WIDTH_MM = 100
export const AUSPOST_LABEL_HEIGHT_MM = 150

const MARGIN = 3
const INNER_L = MARGIN
const INNER_R = AUSPOST_LABEL_WIDTH_MM - MARGIN
const INNER_W = INNER_R - INNER_L

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
 * Production shipping label PDF — AusPost thermal size 100×150 mm.
 * Code 128 encodes {@link getShippingLabelBarcodePayload}
 * (order id until AusPost tracking is stored).
 */
export async function buildAdminShippingLabelPdfBase64(order: OrderRecord): Promise<string> {
  const doc = new jsPDF({
    unit: 'mm',
    format: [AUSPOST_LABEL_WIDTH_MM, AUSPOST_LABEL_HEIGHT_MM],
    orientation: 'portrait',
  })

  let y = MARGIN + 3

  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.3)
  doc.rect(1.5, 1.5, AUSPOST_LABEL_WIDTH_MM - 3, AUSPOST_LABEL_HEIGHT_MM - 3, 'S')

  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(100, 116, 139)
  doc.text('FROM', INNER_L, y)
  y += 3.2

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(17, 24, 39)
  doc.text(SENDER_NAME, INNER_L, y)
  y += 3.6
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(55, 65, 81)
  for (const line of SENDER_ADDRESS_LINES) {
    doc.text(line, INNER_L, y)
    y += 3.2
  }

  y += 1.2
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(INNER_L, y, INNER_R, y)
  y += 3.5

  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(100, 116, 139)
  doc.text('DELIVER TO', INNER_L, y)
  y += 3.5

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 24, 39)
  const nameLines = doc.splitTextToSize(recipientDisplayName(order), INNER_W)
  const nameShow = nameLines.slice(0, 2)
  doc.text(nameShow, INNER_L, y)
  y += nameShow.length * 4.2 + 0.8

  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(31, 41, 55)
  const stLines = doc.splitTextToSize(streetLine(order), INNER_W).slice(0, 2)
  doc.text(stLines, INNER_L, y)
  y += stLines.length * 3.6 + 1.5

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 24, 39)
  const locality = formatLocalityLine(order)
  const locLines = doc.splitTextToSize(locality, INNER_W).slice(0, 2)
  doc.text(locLines, INNER_L, y)
  y += locLines.length * 4

  const addr = order.address
  const country = (addr?.country || '').trim()
  if (country && !isAustralia(country)) {
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(71, 85, 105)
    doc.text(country, INNER_L, y)
    y += 3.2
  }

  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(71, 85, 105)
  const phone = (order.customer?.phone || '').trim()
  if (phone) {
    doc.text(`Ph ${phone}`, INNER_L, y)
    y += 3
  }

  y += 1.5
  const pers = formatOrderPersonalizationForLabel(order)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(71, 85, 105)
  const persAll = doc.splitTextToSize(pers, INNER_W - 3)
  const maxPersLines = 4
  const persLines =
    persAll.length > maxPersLines
      ? [...persAll.slice(0, maxPersLines - 1), `${String(persAll[maxPersLines - 1] ?? '').slice(0, 40)}…`]
      : persAll
  const lineH = 2.8
  const persBoxH = 4.5 + persLines.length * lineH + 2
  const persTop = y
  doc.roundedRect(INNER_L, persTop - 1.5, INNER_W, persBoxH, 0.8, 0.8, 'FD')
  doc.text('PERSONALIZATION', INNER_L + 1.5, persTop + 1.8)
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(17, 24, 39)
  doc.text(persLines, INNER_L + 1.5, persTop + 4.5)
  y = persTop + persBoxH + 2.5

  const weightKg = computeDeclaredShippingWeightKg(order)
  const weightStr = formatDeclaredWeightForLabel(weightKg)
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(55, 65, 81)
  doc.text(`Service: ${INTERNAL_SERVICE_DISPLAY}  ·  Wt: ${weightStr}`, INNER_L, y)
  y += 3
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 116, 139)
  const itemLine = itemsSummaryLine(order, 90)
  const itemWrapped = doc.splitTextToSize(`Items: ${itemLine}`, INNER_W).slice(0, 2)
  doc.text(itemWrapped, INNER_L, y)
  y += itemWrapped.length * 2.8 + 1.5

  const created = order.createdAtIso
    ? new Date(order.createdAtIso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(148, 163, 184)
  doc.text(`Order ${order.id}  ·  ${created}`, INNER_L, y, { maxWidth: INNER_W })
  y += 3.5

  const barcodeReserved = 28
  const barcodeY = Math.min(
    Math.max(y + 1, AUSPOST_LABEL_HEIGHT_MM - barcodeReserved - MARGIN),
    AUSPOST_LABEL_HEIGHT_MM - barcodeReserved - MARGIN
  )
  const barcodeText = toCode128Payload(getShippingLabelBarcodePayload(order))
  const png: Buffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: barcodeText,
    scale: 2,
    height: 10,
    includetext: true,
    textfont: 'Helvetica',
    textsize: 7,
    textxalign: 'center',
    barcolor: '000000',
    textcolor: '000000',
  })
  const imgData = `data:image/png;base64,${png.toString('base64')}`
  const barW = Math.min(INNER_W - 4, 88)
  const barH = 16
  const barX = INNER_L + (INNER_W - barW) / 2
  try {
    doc.addImage(imgData, 'PNG', barX, barcodeY, barW, barH)
  } catch {
    doc.setFont('courier', 'normal').setFontSize(7).setTextColor(17, 24, 39)
    doc.text(barcodeText, INNER_L, barcodeY + 5)
  }

  doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(148, 163, 184)
  const noteY = Math.min(barcodeY + barH + 2.5, AUSPOST_LABEL_HEIGHT_MM - MARGIN - 1)
  doc.text('100×150 mm · internal barcode (order/tracking)', INNER_L, noteY, {
    maxWidth: INNER_W,
  })

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
