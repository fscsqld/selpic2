import { jsPDF } from 'jspdf'
import bwipjs from 'bwip-js/node'
import type { OrderRecord } from '@/lib/store'
import { formatOrderPersonalizationForLabel } from '@/lib/adminOrderListUtils'
import {
  computeDeclaredShippingWeightKg,
  formatDeclaredWeightForLabel,
} from '@/lib/shipping/orderDeclaredWeightKg'
import { getShippingLabelBarcodePayload } from '@/lib/shipping/shippingLabelBarcodePayload'
import { resolveShippingLabelFromPrint } from '@/lib/shipping/shippingLabelFrom'
import {
  normalizeShippingLabelOrientation,
  resolveShippingLabelOrientation,
  type ShippingLabelOrientation,
} from '@/lib/shipping/shippingLabelOrientation'
import {
  landscapeFormBBoxPoints,
  landscapeFormStampMatrix,
} from '@/lib/shipping/shippingLabelLandscapeForm'

/** Service line on internal labels until live API selects a product. */
const INTERNAL_SERVICE_DISPLAY = 'Standard Letter'

/** Ledger / counter option names must not print on the physical label. */
function serviceDisplayName(order: OrderRecord): string {
  const raw = (order.shippingOptionName || '').trim()
  if (!raw) return INTERNAL_SERVICE_DISPLAY
  if (/manual\s*ship|auspost-style|counter\s*\/|not a storefront/i.test(raw)) {
    return INTERNAL_SERVICE_DISPLAY
  }
  return raw
}

function hasPersonalizationForLabel(pers: string): boolean {
  const t = pers.trim()
  return t.length > 0 && t !== '—'
}

export type AdminShippingLabelLayout = 'avery-l7169'
export type AdminShippingLabelSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type { ShippingLabelOrientation }

/** Fill order on each Avery L7169 sheet (2×2). */
export const AVERY_L7169_SLOT_ORDER: readonly AdminShippingLabelSlot[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

export const AVERY_L7169_LABELS_PER_PAGE = AVERY_L7169_SLOT_ORDER.length

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

function pdfBase64FromDoc(doc: jsPDF): string {
  const dataUri = doc.output('datauristring') as string
  const parts = dataUri.split(',')
  return parts.length > 1 ? parts[1] : ''
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
  const parts = (order.items || [])
    .map((it) => {
      const name = String(it.name || '').trim()
      if (!name) return ''
      return `${name} ×${it.quantity || 1}`
    })
    .filter(Boolean)
  const s = parts.join(' · ')
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen - 1)}…`
}

function shouldPrintItemsLine(order: OrderRecord): boolean {
  return itemsSummaryLine(order, 110).trim().length > 0
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
  /** Default portrait — existing draw path. Landscape rotates content in the same Avery cell. */
  orientation?: ShippingLabelOrientation
}

function drawLabelFrame(doc: jsPDF, box: LabelBox): void {
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.3)
  doc.rect(box.x, box.y, box.width, box.height, 'S')
}

/**
 * Portrait content (unchanged layout). Also reused for landscape after a CTM rotate
 * into a virtual 139×99.1 mm box.
 */
async function drawShippingLabel(doc: jsPDF, order: OrderRecord, box: LabelBox): Promise<void> {
  const innerL = box.x + LABEL_INNER_MARGIN_MM
  const innerR = box.x + box.width - LABEL_INNER_MARGIN_MM
  const innerW = innerR - innerL
  const boxBottom = box.y + box.height
  const contentMaxY = boxBottom - LABEL_INNER_MARGIN_MM
  let y = box.y + LABEL_INNER_MARGIN_MM + 2.5

  drawLabelFrame(doc, box)

  // 1) DELIVER TO — address block emphasized (bold, larger, high contrast)
  const ADDR_SIZE = 11
  const ADDR_LINE_H = 5.6

  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(71, 85, 105)
  doc.text('DELIVER TO', innerL, y)
  y += 5.4

  doc.setFont('helvetica', 'bold').setFontSize(ADDR_SIZE).setTextColor(15, 23, 42)
  const nameShow = doc.splitTextToSize(recipientDisplayName(order), innerW).slice(0, 2)
  doc.text(nameShow, innerL, y)
  y += nameShow.length * ADDR_LINE_H + 0.8

  const stLines = doc.splitTextToSize(streetLine(order), innerW).slice(0, 2)
  doc.text(stLines, innerL, y)
  y += stLines.length * ADDR_LINE_H + 0.8

  const locLines = doc.splitTextToSize(formatLocalityLine(order), innerW).slice(0, 2)
  doc.text(locLines, innerL, y)
  y += locLines.length * ADDR_LINE_H

  const country = (order.address?.country || '').trim()
  if (country && !isAustralia(country)) {
    doc.text(country, innerL, y)
    y += ADDR_LINE_H
  }

  const phone = (order.customer?.phone || '').trim()
  if (phone && phone !== '—') {
    doc.text(`Ph ${phone}`, innerL, y)
    y += ADDR_LINE_H
  }

  y += 1.2
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.25)
  doc.line(innerL, y, innerR, y)
  y += 3.2

  // 2) Order / personalization / items (skip empty PERSONALIZATION — no "—" box)
  const pers = formatOrderPersonalizationForLabel(order)
  if (hasPersonalizationForLabel(pers)) {
    doc.setDrawColor(203, 213, 225)
    doc.setFillColor(248, 250, 252)
    doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(71, 85, 105)
    const persAll = doc.splitTextToSize(pers, innerW - 3)
    const maxPersLines = 3
    const persLines =
      persAll.length > maxPersLines
        ? [...persAll.slice(0, maxPersLines - 1), `${String(persAll[maxPersLines - 1] ?? '').slice(0, 48)}…`]
        : persAll
    const persLineH = 3.4
    const persBoxH = 4.5 + persLines.length * persLineH + 1.2
    const persTop = y
    doc.roundedRect(innerL, persTop - 1.5, innerW, persBoxH, 0.8, 0.8, 'FD')
    doc.text('PERSONALIZATION', innerL + 1.5, persTop + 1.8)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(17, 24, 39)
    doc.text(persLines, innerL + 1.5, persTop + 4.6)
    y = persTop + persBoxH + 2.2
  }

  const weightKg = computeDeclaredShippingWeightKg(order)
  const weightStr = formatDeclaredWeightForLabel(weightKg)
  const serviceName = serviceDisplayName(order)
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(55, 65, 81)
  doc.text(`Service: ${serviceName}  ·  Wt: ${weightStr}`, innerL, y, { maxWidth: innerW })
  y += 3.6

  if (shouldPrintItemsLine(order)) {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(31, 41, 55)
    const itemLine = itemsSummaryLine(order, 110)
    const itemWrapped = doc.splitTextToSize(`Items: ${itemLine}`, innerW).slice(0, 3)
    doc.text(itemWrapped, innerL, y)
    y += itemWrapped.length * 3.5 + 1.5
  }

  const created = order.createdAtIso
    ? new Date(order.createdAtIso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(100, 116, 139)
  doc.text(`Order ${order.id}  ·  ${created}`, innerL, y, { maxWidth: innerW })
  y += 4

  // 3) Barcode soon after content (no large empty middle)
  const barH = 14
  const fromBlockH = 14
  const barcodeY = Math.min(y + 0.5, contentMaxY - barH - fromBlockH - 2)
  const barcodeText = toCode128Payload(getShippingLabelBarcodePayload(order))
  const png: Buffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: barcodeText,
    scale: 2,
    height: 9,
    includetext: true,
    textfont: 'Helvetica',
    textsize: 7,
    textxalign: 'center',
    barcolor: '000000',
    textcolor: '000000',
  })
  const imgData = `data:image/png;base64,${png.toString('base64')}`
  const barW = Math.min(innerW - 4, 88)
  const barX = innerL + (innerW - barW) / 2
  try {
    doc.addImage(imgData, 'PNG', barX, barcodeY, barW, barH)
  } catch {
    doc.setFont('courier', 'normal').setFontSize(7).setTextColor(17, 24, 39)
    doc.text(barcodeText, innerL, barcodeY + 5)
  }

  // 4) FROM under barcode — clear gap below barcode
  let fromY = barcodeY + barH + 5.5
  if (fromY + fromBlockH > contentMaxY) {
    fromY = Math.max(barcodeY + barH + 3.5, contentMaxY - fromBlockH)
  }
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(innerL, fromY - 1.5, innerR, fromY - 1.5)

  doc.setFont('helvetica', 'bold').setFontSize(5).setTextColor(100, 116, 139)
  doc.text('FROM', innerL, fromY)
  fromY += 2.8
  const fromPrint = resolveShippingLabelFromPrint(order)
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(55, 65, 81)
  doc.text(fromPrint.name, innerL, fromY)
  fromY += 2.8
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 116, 139)
  doc.text(`${fromPrint.addressLine1}, ${fromPrint.addressLine2}`, innerL, fromY, {
    maxWidth: innerW,
  })
}

/**
 * Draw into an Avery L7169 cell. Portrait = existing path (unchanged).
 * Landscape = draw into a Form XObject (139×99.1 mm content), then stamp with rotation.
 * Do NOT apply setCurrentTransformationMatrix around text in compat mode —
 * that sends content off-page (empty label on print).
 */
async function drawShippingLabelInSlot(
  doc: jsPDF,
  order: OrderRecord,
  physicalBox: LabelBox,
  orientation: ShippingLabelOrientation
): Promise<void> {
  if (orientation !== 'landscape') {
    await drawShippingLabel(doc, order, physicalBox)
    return
  }

  const vw = AVERY_LABEL_HEIGHT_MM // 139 — long edge of cell
  const vh = AVERY_LABEL_WIDTH_MM // 99.1 — short edge of cell
  const formKey = `ship-label-ls-${order.id}-${Math.random().toString(36).slice(2, 9)}`
  const scaleFactor = doc.internal.scaleFactor
  const { widthPt, heightPt } = landscapeFormBBoxPoints(vw, vh, scaleFactor)

  // BBox must be PDF points so clip matches scaled content (see orientation rule).
  doc.beginFormObject(0, 0, widthPt, heightPt, new doc.Matrix(1, 0, 0, 1, 0, 0))
  await drawShippingLabel(doc, order, { x: 0, y: 0, width: vw, height: vh })
  doc.endFormObject(formKey)

  // 90° CCW into the cell — NOT Matrix(0,1,1,0) which mirrors glyphs.
  const m = landscapeFormStampMatrix({
    cellXMm: physicalBox.x,
    cellYMm: physicalBox.y,
    cellWidthMm: physicalBox.width,
    cellHeightMm: physicalBox.height,
    formWidthMm: vw,
    formHeightMm: vh,
    pageHeightMm: doc.internal.pageSize.getHeight(),
    scaleFactor,
  })
  doc.doFormObject(formKey, new doc.Matrix(m.a, m.b, m.c, m.d, m.e, m.f))
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
  const orientation =
    options?.orientation ?? resolveShippingLabelOrientation(order)
  const doc = new jsPDF({
    unit: 'mm',
    format: layout === 'avery-l7169' ? 'a4' : [A4_WIDTH_MM, A4_HEIGHT_MM],
    orientation: 'portrait',
  })
  const origin = SLOT_ORIGIN_MM[slot]
  await drawShippingLabelInSlot(
    doc,
    order,
    {
      x: origin.x,
      y: origin.y,
      width: AVERY_LABEL_WIDTH_MM,
      height: AVERY_LABEL_HEIGHT_MM,
    },
    normalizeShippingLabelOrientation(orientation)
  )

  return pdfBase64FromDoc(doc)
}

/**
 * Batch Avery L7169 PDF: up to 4 labels per A4 page in 2×2 fill order.
 * Partial last page leaves remaining slots blank.
 * Per-order orientation from {@link OrderRecord.shippingLabelOrientation} (default portrait).
 */
export async function buildAdminShippingLabelsBatchPdfBase64(orders: OrderRecord[]): Promise<{
  pdfBase64: string
  pageCount: number
  labelCount: number
}> {
  if (!orders.length) {
    throw new Error('No orders to print.')
  }

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  })

  let pageIndex = 0
  for (let i = 0; i < orders.length; i += AVERY_L7169_LABELS_PER_PAGE) {
    if (pageIndex > 0) {
      doc.addPage('a4', 'portrait')
    }
    const chunk = orders.slice(i, i + AVERY_L7169_LABELS_PER_PAGE)
    for (let j = 0; j < chunk.length; j++) {
      const slot = AVERY_L7169_SLOT_ORDER[j]
      const origin = SLOT_ORIGIN_MM[slot]
      const order = chunk[j]
      await drawShippingLabelInSlot(
        doc,
        order,
        {
          x: origin.x,
          y: origin.y,
          width: AVERY_LABEL_WIDTH_MM,
          height: AVERY_LABEL_HEIGHT_MM,
        },
        resolveShippingLabelOrientation(order)
      )
    }
    pageIndex += 1
  }

  return {
    pdfBase64: pdfBase64FromDoc(doc),
    pageCount: pageIndex,
    labelCount: orders.length,
  }
}
