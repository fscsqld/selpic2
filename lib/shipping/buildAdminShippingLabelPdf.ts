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

export type AdminShippingLabelLayout = 'avery-l7169'
export type AdminShippingLabelSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const AVERY_LABEL_WIDTH_MM = 99.1
const AVERY_LABEL_HEIGHT_MM = 139
const AVERY_LEFT_MARGIN_MM = 5.01
const AVERY_TOP_MARGIN_MM = 7.06
const AVERY_HORIZONTAL_GAP_MM = 2.4
const AVERY_VERTICAL_GAP_MM = 0
const LABEL_INNER_MARGIN_MM = 3

const SLOT_ORIGIN_MM: Record<AdminShippingLabelSlot, { x: number; y: number }> = {
  'top-left': { x: AVERY_LEFT_MARGIN_MM, y: AVERY_TOP_MARGIN_MM },
  'top-right': {
    x: AVERY_LEFT_MARGIN_MM + AVERY_LABEL_WIDTH_MM + AVERY_HORIZONTAL_GAP_MM,
    y: AVERY_TOP_MARGIN_MM,
  },
  'bottom-left': {
    x: AVERY_LEFT_MARGIN_MM,
    y: AVERY_TOP_MARGIN_MM + AVERY_LABEL_HEIGHT_MM + AVERY_VERTICAL_GAP_MM,
  },
  'bottom-right': {
    x: AVERY_LEFT_MARGIN_MM + AVERY_LABEL_WIDTH_MM + AVERY_HORIZONTAL_GAP_MM,
    y: AVERY_TOP_MARGIN_MM + AVERY_LABEL_HEIGHT_MM + AVERY_VERTICAL_GAP_MM,
  },
}

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

type LabelBox = {
  x: number
  y: number
  width: number
  height: number
}

type BuildOptions = {
  layout?: AdminShippingLabelLayout
  slot?: AdminShippingLabelSlot
}

function drawLabelFrame(doc: jsPDF, box: LabelBox): void {
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.3)
  doc.rect(box.x, box.y, box.width, box.height, 'S')
}

async function drawShippingLabel(doc: jsPDF, order: OrderRecord, box: LabelBox): Promise<void> {
  const innerL = box.x + LABEL_INNER_MARGIN_MM
  const innerR = box.x + box.width - LABEL_INNER_MARGIN_MM
  const innerW = innerR - innerL
  const boxBottom = box.y + box.height
  let y = box.y + LABEL_INNER_MARGIN_MM + 3

  drawLabelFrame(doc, box)

  // FROM — compact (sender is secondary for delivery staff)
  doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(100, 116, 139)
  doc.text('FROM', innerL, y)
  y += 2.8

  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(17, 24, 39)
  doc.text(SENDER_NAME, innerL, y)
  y += 3
  doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(55, 65, 81)
  for (const line of SENDER_ADDRESS_LINES) {
    doc.text(line, innerL, y)
    y += 2.7
  }

  y += 1
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(innerL, y, innerR, y)
  y += 3.2

  // DELIVER TO — larger for carriers / packing staff
  doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(100, 116, 139)
  doc.text('DELIVER TO', innerL, y)
  y += 3.5

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(17, 24, 39)
  const nameLines = doc.splitTextToSize(recipientDisplayName(order), innerW)
  const nameShow = nameLines.slice(0, 2)
  doc.text(nameShow, innerL, y)
  y += nameShow.length * 4.6 + 0.8

  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(31, 41, 55)
  const stLines = doc.splitTextToSize(streetLine(order), innerW).slice(0, 2)
  doc.text(stLines, innerL, y)
  y += stLines.length * 4 + 1.2

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 24, 39)
  const locality = formatLocalityLine(order)
  const locLines = doc.splitTextToSize(locality, innerW).slice(0, 2)
  doc.text(locLines, innerL, y)
  y += locLines.length * 4.4

  const addr = order.address
  const country = (addr?.country || '').trim()
  if (country && !isAustralia(country)) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(71, 85, 105)
    doc.text(country, innerL, y)
    y += 3.2
  }

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(17, 24, 39)
  const phone = (order.customer?.phone || '').trim()
  if (phone) {
    doc.text(`Ph ${phone}`, innerL, y)
    y += 3.6
  }

  y += 1.2
  const pers = formatOrderPersonalizationForLabel(order)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(71, 85, 105)
  const persAll = doc.splitTextToSize(pers, innerW - 3)
  const maxPersLines = 3
  const persLines =
    persAll.length > maxPersLines
      ? [...persAll.slice(0, maxPersLines - 1), `${String(persAll[maxPersLines - 1] ?? '').slice(0, 40)}…`]
      : persAll
  const lineH = 2.6
  const persBoxH = 4 + persLines.length * lineH + 1.5
  const persTop = y
  doc.roundedRect(innerL, persTop - 1.5, innerW, persBoxH, 0.8, 0.8, 'FD')
  doc.text('PERSONALIZATION', innerL + 1.5, persTop + 1.6)
  doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(17, 24, 39)
  doc.text(persLines, innerL + 1.5, persTop + 4.2)
  y = persTop + persBoxH + 2

  const weightKg = computeDeclaredShippingWeightKg(order)
  const weightStr = formatDeclaredWeightForLabel(weightKg)
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(55, 65, 81)
  doc.text(`Service: ${INTERNAL_SERVICE_DISPLAY}  ·  Wt: ${weightStr}`, innerL, y)
  y += 2.8
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 116, 139)
  const itemLine = itemsSummaryLine(order, 90)
  const itemWrapped = doc.splitTextToSize(`Items: ${itemLine}`, innerW).slice(0, 2)
  doc.text(itemWrapped, innerL, y)
  y += itemWrapped.length * 2.6 + 1.2

  const created = order.createdAtIso
    ? new Date(order.createdAtIso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(148, 163, 184)
  doc.text(`Order ${order.id}  ·  ${created}`, innerL, y, { maxWidth: innerW })
  y += 3

  const barcodeReserved = 26
  const barcodeY = Math.min(
    Math.max(y + 1, boxBottom - barcodeReserved - LABEL_INNER_MARGIN_MM),
    boxBottom - barcodeReserved - LABEL_INNER_MARGIN_MM
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
  const barW = Math.min(innerW - 4, 88)
  const barH = 15
  const barX = innerL + (innerW - barW) / 2
  try {
    doc.addImage(imgData, 'PNG', barX, barcodeY, barW, barH)
  } catch {
    doc.setFont('courier', 'normal').setFontSize(7).setTextColor(17, 24, 39)
    doc.text(barcodeText, innerL, barcodeY + 5)
  }
}

/**
 * Production shipping label PDF — Avery L7169 / AV959020 A4 4-up.
 * Code 128 encodes {@link getShippingLabelBarcodePayload}
 * (order id until AusPost tracking is stored).
 */
export async function buildAdminShippingLabelPdfBase64(
  order: OrderRecord,
  options?: BuildOptions
): Promise<string> {
  const layout = options?.layout ?? 'avery-l7169'
  const slot = options?.slot ?? 'top-left'
  const doc = new jsPDF({
    unit: 'mm',
    format: layout === 'avery-l7169' ? 'a4' : [A4_WIDTH_MM, A4_HEIGHT_MM],
    orientation: 'portrait',
  })
  const origin = SLOT_ORIGIN_MM[slot]
  await drawShippingLabel(doc, order, {
    x: origin.x,
    y: origin.y,
    width: AVERY_LABEL_WIDTH_MM,
    height: AVERY_LABEL_HEIGHT_MM,
  })

  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
}
