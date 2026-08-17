import { jsPDF } from 'jspdf'

/**
 * Server-safe PDF from fundraising HTML: strips tags and lays out plain text.
 * Browser admin flows should prefer `htmlToPdfClient` (visual fidelity).
 *
 * Important: default jsPDF Helvetica is WinAnsi-ish. Unicode arrows (→), ballot boxes (☐),
 * and CJK text corrupt glyph widths and produce spaced-out / vertical letter garbage.
 * Always run body text through {@link toJsPdfSafeText} before `doc.text`.
 */
export function buildFundraisingDocPdfBase64(input: {
  title: string
  type: string
  organizationName?: string
  html: string
}): string {
  const text = toJsPdfSafeText(stripHtmlToText(input.html))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (need: number) => {
    if (y + need <= 285) return
    doc.addPage()
    y = margin
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('SELPIC Community Fundraising', margin, y)
  y += 8

  doc.setFontSize(12)
  const titleLines = doc.splitTextToSize(toJsPdfSafeText(input.title || input.type), contentWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 6 + 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80)
  const meta = [`Document: ${input.type}`, input.organizationName ? `Partner: ${input.organizationName}` : '']
    .filter(Boolean)
    .join('  ·  ')
  if (meta) {
    doc.text(toJsPdfSafeText(meta), margin, y)
    y += 8
  }
  doc.setTextColor(20)

  doc.setFontSize(10)
  const bodyLines: string[] = doc.splitTextToSize(text || '(No content)', contentWidth)
  for (const line of bodyLines) {
    ensureSpace(6)
    doc.text(line, margin, y)
    y += 5
  }

  y += 8
  ensureSpace(12)
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'This PDF is generated for email attachment. Keep with your grant records.',
    margin,
    y
  )

  const dataUri = doc.output('datauristring') as string
  const b64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
  if (!b64 || !Buffer.from(b64, 'base64').subarray(0, 5).toString().startsWith('%PDF')) {
    throw new Error('Fundraising PDF generation failed')
  }
  return b64
}

/** Strip tags to readable plain text for PDF body layout. */
function stripHtmlToText(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|table|section)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n)
      return Number.isFinite(code) ? String.fromCharCode(code) : ' '
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * Map symbols / CJK to PDF-safe text so Helvetica does not shatter lines into
 * one-letter-per-glyph layout (seen with → / ☐ / Korean in email attachments).
 */
export function toJsPdfSafeText(input: string): string {
  let s = String(input || '')
  const replacements: Array<[RegExp, string]> = [
    [/\u2192|\u2794|\u279C/g, '->'],
    [/\u2190/g, '<-'],
    [/\u2610/g, '[ ]'],
    [/\u2611|\u2612/g, '[x]'],
    [/\u2022|\u25CF|\u25E6/g, '-'],
    [/\u2013|\u2014|\u2212/g, '-'],
    [/\u2018|\u2019|\u2032/g, "'"],
    [/\u201C|\u201D|\u2033/g, '"'],
    [/\u00A0/g, ' '],
    [/\u2026/g, '...'],
    [/\u00A9/g, '(c)'],
    [/\u2122/g, '(TM)'],
  ]
  for (const [re, to] of replacements) s = s.replace(re, to)

  // Keep tab/newline + basic Latin + Latin-1 supplement (common in AU English copy).
  const unsupported = /[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g
  if (unsupported.test(s)) {
    const cleaned = s.replace(unsupported, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    return (
      '[Note: Some characters in the original message (for example Korean text) cannot display in this PDF font. ' +
      'Please read the full message in the email notice or Partner Lookup -> Your change requests.]\n\n' +
      cleaned.trim()
    )
  }
  return s
}

export function fundraisingPdfFilename(type: string, organizationName?: string, period?: string): string {
  const org = (organizationName || 'partner')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'partner'
  const per = period ? `-${period}` : ''
  return `SELPIC-${type}-${org}${per}.pdf`
}
