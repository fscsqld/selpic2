/**
 * Printable A4 Family Flyer (fly4 blank artwork).
 *
 * Dynamic partner code is drawn in two places:
 *  1) Header: code chip between gift 🎁 and handshake 🤝 (height matched to icons)
 *  2) Footer: inside Order today … ( CODE ) — small line wiped and redrawn larger
 */

export type FamilyFlyerInput = {
  organizationName: string
  promoCode: string
  parentDisplayRate: number
  donationRate: number
}

const TPL_W = 571
const TPL_H = 1024

/** Measured from fly4 artwork: gift ~41×48, handshake ~55×45 → use h=48 */
const ICON_BAND_Y = 256
const ICON_H = 48
const ICON_LEFT_MAX_X = 104
const ICON_RIGHT_MIN_X = 457

export function familyFlyerPdfFilename(promoCode: string): string {
  const code =
    String(promoCode || 'CODE')
      .trim()
      .replace(/[^\w.&+-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 48) || 'CODE'
  return `SELPIC_Family_Flyer_${code}.pdf`
}

async function loadTemplateDataUrl(): Promise<string> {
  const res = await fetch(`/fundraising/family-flyer-template.png?v=20260805fly4d`)
  if (!res.ok) throw new Error('Family flyer template could not be loaded')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read flyer template'))
    reader.readAsDataURL(blob)
  })
}

function fitFontSize(
  pdf: {
    getStringUnitWidth: (t: string) => number
    internal: { scaleFactor: number }
    setFontSize: (n: number) => void
  },
  text: string,
  maxWidthMm: number,
  startSize: number,
  minSize: number
): number {
  let size = startSize
  while (size > minSize) {
    pdf.setFontSize(size)
    const w = (pdf.getStringUnitWidth(text) * size) / pdf.internal.scaleFactor
    if (w <= maxWidthMm) return size
    size -= 0.3
  }
  pdf.setFontSize(minSize)
  return minSize
}

/**
 * Download A4 PDF — fly4 artwork + partner code chip between header icons and in footer ( ).
 */
export async function downloadFamilyFlyerA4Pdf(input: FamilyFlyerInput): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const code = String(input.promoCode || 'YOUR-CODE').trim()
  const dataUrl = await loadTemplateDataUrl()
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })

  const pageW = 210
  const pageH = 297
  const scale = Math.min(pageW / TPL_W, pageH / TPL_H)
  const drawW = TPL_W * scale
  const drawH = TPL_H * scale
  const ox = (pageW - drawW) / 2
  const oy = (pageH - drawH) / 2

  pdf.addImage(dataUrl, 'PNG', ox, oy, drawW, drawH)

  const X = (px: number) => ox + (px / TPL_W) * drawW
  const Y = (py: number) => oy + (py / TPL_H) * drawH
  const W = (pw: number) => (pw / TPL_W) * drawW
  const H = (ph: number) => (ph / TPL_H) * drawH
  const cx = ox + drawW / 2

  // --- Slot 1: pretty promo chip between icons (height = gift/handshake) ---
  const gapPx = ICON_RIGHT_MIN_X - ICON_LEFT_MAX_X
  const maxBoxWPx = Math.min(300, gapPx - 28)
  const padXPx = 26
  const boxH = H(ICON_H)
  const boxTop = Y(ICON_BAND_Y)

  pdf.setFont('helvetica', 'bold')
  const startPt = Math.max(11, (ICON_H * scale * 0.52) / 0.352778)
  let codeSize = fitFontSize(pdf, code, W(maxBoxWPx - padXPx * 2), startPt, 9)
  let textW = (pdf.getStringUnitWidth(code) * codeSize) / pdf.internal.scaleFactor
  let boxW = Math.min(W(maxBoxWPx), Math.max(W(150), textW + W(padXPx * 2)))
  codeSize = fitFontSize(pdf, code, boxW - W(padXPx * 2), codeSize, 9)
  textW = (pdf.getStringUnitWidth(code) * codeSize) / pdf.internal.scaleFactor
  boxW = Math.min(W(maxBoxWPx), Math.max(W(150), textW + W(padXPx * 2)))

  const boxX = cx - boxW / 2
  const radius = boxH * 0.48

  // Soft layered shadow
  pdf.setFillColor(226, 232, 240)
  pdf.roundedRect(boxX + W(2), boxTop + H(2.8), boxW, boxH, radius, radius, 'F')
  pdf.setFillColor(241, 245, 249)
  pdf.roundedRect(boxX + W(1), boxTop + H(1.4), boxW, boxH, radius, radius, 'F')

  // White card
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(boxX, boxTop, boxW, boxH, radius, radius, 'F')

  // Soft mint wash (inner)
  pdf.setFillColor(240, 253, 250)
  pdf.roundedRect(
    boxX + W(2.5),
    boxTop + H(2.5),
    boxW - W(5),
    boxH - H(5),
    radius * 0.82,
    radius * 0.82,
    'F'
  )

  // Puzzle-palette top accent strip (matches header puzzle colors)
  const stripY = boxTop + H(4.5)
  const stripH = H(3.2)
  const stripPad = W(14)
  const stripW = boxW - stripPad * 2
  const accents: [number, number, number][] = [
    [251, 146, 60], // orange
    [250, 204, 21], // yellow
    [52, 211, 153], // green
    [56, 189, 248], // sky
    [244, 114, 182], // pink
  ]
  const segW = stripW / accents.length
  accents.forEach((rgb, i) => {
    pdf.setFillColor(rgb[0], rgb[1], rgb[2])
    const sx = boxX + stripPad + i * segW
    const rr = stripH * 0.45
    pdf.roundedRect(sx + W(0.4), stripY, segW - W(0.8), stripH, rr, rr, 'F')
  })

  // Side ribbon caps (gift vibe)
  const capW = W(4.5)
  const capY = boxTop + H(10)
  const capH = boxH - H(16)
  pdf.setFillColor(251, 146, 60)
  pdf.roundedRect(boxX + W(4), capY, capW, capH, W(2), W(2), 'F')
  pdf.setFillColor(20, 184, 166)
  pdf.roundedRect(boxX + boxW - W(4) - capW, capY, capW, capH, W(2), W(2), 'F')

  // Teal outer stroke (like HOW TO number circles)
  pdf.setDrawColor(13, 148, 136)
  pdf.setLineWidth(0.65)
  pdf.roundedRect(boxX, boxTop, boxW, boxH, radius, radius, 'S')

  // Soft inner stroke
  pdf.setDrawColor(153, 246, 228)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(
    boxX + W(2),
    boxTop + H(2),
    boxW - W(4),
    boxH - H(4),
    radius * 0.85,
    radius * 0.85,
    'S'
  )

  // Coupon punch holes on left/right
  const notchR = H(5)
  const notchCy = boxTop + boxH / 2
  pdf.setFillColor(255, 255, 255)
  pdf.circle(boxX, notchCy, notchR, 'F')
  pdf.circle(boxX + boxW, notchCy, notchR, 'F')
  pdf.setDrawColor(13, 148, 136)
  pdf.setLineWidth(0.35)
  pdf.circle(boxX, notchCy, notchR, 'S')
  pdf.circle(boxX + boxW, notchCy, notchR, 'S')

  // Code — teal, optically centered below accent strip
  pdf.setTextColor(15, 118, 110)
  pdf.setFontSize(codeSize)
  const textBaseline = boxTop + boxH * 0.58 + (codeSize * 0.32) / 2.83465
  pdf.text(code, cx, textBaseline, { align: 'center' })

  // --- Slot 2: footer — wipe tiny printed line, redraw larger with code in ( ) ---
  pdf.setFillColor(255, 255, 255)
  pdf.rect(X(18), Y(986), W(535), H(32), 'F')

  const footer = `Order today at selpic.com.au · (${code})`
  pdf.setTextColor(20, 20, 20)
  pdf.setFont('helvetica', 'bold')
  const footerSize = fitFontSize(pdf, footer, W(530), 16, 12)
  pdf.setFontSize(footerSize)
  pdf.text(footer, cx, Y(1008), { align: 'center' })

  pdf.save(familyFlyerPdfFilename(code))
}

export function buildFamilyFlyerHtml(input: FamilyFlyerInput): string {
  const code = String(input.promoCode || 'YOUR-CODE')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Flyer — ${code}</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px;">
  <p>Partner community code on flyer: <strong>${code}</strong></p>
</body></html>`
}
