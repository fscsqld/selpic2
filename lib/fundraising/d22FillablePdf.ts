import { jsPDF, AcroFormCheckBox, AcroFormTextField } from 'jspdf'

import { toJsPdfSafeText } from '@/lib/fundraising/htmlToSimplePdfServer'

export type D22FillablePdfInput = {
  organizationName: string
  contactName?: string
  partnerId?: string
  promoCode?: string
  changeRequestId?: string
  kindLabel?: string
  partnerMessage?: string
  maskedAbn?: string
  maskedBsb?: string
  maskedAccount?: string
  payeeAccountName?: string
  companyName?: string
  supportEmail?: string
}

/**
 * Fillable D22 Partnership Change Request Form (AcroForm).
 * Compact layout: one line-gap before section titles (3–6), not a new page per section.
 * Only section 2 starts on a new page so it stays clear of the signature widget.
 */
export function buildD22FillablePdfBase64(input: D22FillablePdfInput): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageW = 210
  const contentW = pageW - margin * 2
  const company = toJsPdfSafeText(input.companyName || 'SELPIC PTY LTD')
  const org = toJsPdfSafeText(input.organizationName || 'Organisation')
  const support = toJsPdfSafeText(input.supportEmail || 'info@selpic.com.au')
  let y = margin
  let fieldSeq = 0

  /** ~one blank line before a section title (same idea as spacing into "2. Change type"). */
  const TITLE_GAP = 7
  const FIELD_GAP = 5

  const ensure = (need: number) => {
    if (y + need <= 285) return
    doc.addPage()
    y = margin
  }

  const safe = (s: string | undefined | null) => toJsPdfSafeText(String(s || ''))

  const heading = (text: string, opts?: { gapBefore?: number }) => {
    const gap = opts?.gapBefore ?? TITLE_GAP
    y += gap
    ensure(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(text, margin, y)
    y += 7
  }

  const para = (text: string, size = 9) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(40)
    const lines = doc.splitTextToSize(safe(text), contentW) as string[]
    for (const line of lines) {
      ensure(5)
      doc.text(line, margin, y)
      y += 4.5
    }
  }

  const addTextField = (opts: {
    name: string
    label: string
    height?: number
    multiline?: boolean
    value?: string
    gapAfter?: number
  }) => {
    const h = opts.height ?? 8
    const gapAfter = opts.gapAfter ?? FIELD_GAP
    ensure(h + 12 + gapAfter)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30)
    doc.text(opts.label, margin, y)
    y += 3.5
    const field = new AcroFormTextField()
    field.fieldName = `${opts.name}_${++fieldSeq}`
    field.x = margin
    field.y = y
    field.width = contentW
    field.height = h
    field.fontSize = 10
    field.fontName = 'helvetica'
    field.multiline = Boolean(opts.multiline)
    field.value = opts.value || ''
    field.defaultValue = opts.value || ''
    doc.addField(field)
    doc.setDrawColor(180)
    doc.setLineWidth(0.3)
    doc.rect(margin, y, contentW, h)
    y += h + gapAfter
  }

  const addCheckRow = (name: string, label: string) => {
    ensure(10)
    const box = 5
    const field = new AcroFormCheckBox()
    field.fieldName = `${name}_${++fieldSeq}`
    field.x = margin
    field.y = y - 1
    field.width = box
    field.height = box
    field.appearanceState = 'Off'
    field.value = 'Off'
    doc.addField(field)
    doc.setDrawColor(100)
    doc.rect(margin, y - 1, box, box)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30)
    const lines = doc.splitTextToSize(label, contentW - box - 4) as string[]
    doc.text(lines, margin + box + 3, y + 3)
    y += Math.max(8, lines.length * 4.2 + 2)
  }

  // --- Header ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('SELPIC Community Fundraising', margin, y)
  y += 7
  doc.setFontSize(12)
  doc.text('D22 - Partnership Change Request Form (fillable)', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.text(safe(`${company}  |  Fillable PDF - type, tick, then save and upload`), margin, y)
  y += 6
  doc.setDrawColor(20)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  para(
    'Action required: Download this fillable form from Partner Lookup -> Documents, complete it on a computer (Adobe Reader, Preview, Chrome, Edge, etc.), save, then upload in Partner Lookup -> Grant account -> Your change requests -> Reply & files. You may also print, hand-write, scan/photo, and upload.',
    8
  )
  y += 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20)
  doc.text('Request details (SELPIC completed)', margin, y)
  y += 5
  para(
    [
      `Organisation: ${org}`,
      input.changeRequestId ? `Request ID: ${safe(input.changeRequestId)}` : '',
      input.kindLabel ? `Requested kind: ${safe(input.kindLabel)}` : '',
      input.partnerId ? `Partner ID: ${safe(input.partnerId)}` : '',
      input.promoCode ? `Partner Community Code: ${safe(input.promoCode)}` : '',
      input.contactName ? `On-file contact: ${safe(input.contactName)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    8
  )

  if (String(input.partnerMessage || '').trim()) {
    y += 1
    para('Original request message (see also email notice if non-English characters):', 8)
    para(safe(input.partnerMessage), 9)
  }

  // --- 1. Authorised officer ---
  heading('1. Authorised officer / organisation head', { gapBefore: 6 })
  para(
    'Must be authorised by the organisation (for example Principal, Board Chair, Treasurer, or delegated officer) to instruct SELPIC about payee and contact records.',
    8
  )
  addTextField({ name: 'auth_full_name', label: 'Full legal name *' })
  addTextField({ name: 'auth_position', label: 'Position / role * (e.g. Principal, Board Chair, Treasurer)' })
  addTextField({ name: 'auth_email', label: 'Work email *' })
  addTextField({ name: 'auth_phone', label: 'Phone *' })
  addTextField({ name: 'auth_date', label: 'Date (DD/MM/YYYY) *' })

  ensure(40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20)
  doc.text('Signature of authorised officer *', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80)
  para(
    'Option A - Digital: type your full name in the signature field below (counts as your confirmation). Option B - Wet ink: print this page, sign in the box, then scan/photo and upload.',
    8
  )
  addTextField({
    name: 'auth_signature',
    label: 'Signature / typed full name *',
    height: 18,
    multiline: true,
    gapAfter: 8,
  })

  // Section 2 on next page only (keeps signature clear). Sections 3–6 stay continuous with a one-line title gap.
  doc.addPage()
  y = margin
  heading('2. Change type (tick all that apply) *', { gapBefore: 0 })
  addCheckRow('chg_grant_account', 'Official Grant Account (ABN / BSB / account name / account number)')
  addCheckRow('chg_contact', 'Organisation contact name, email or phone')
  addCheckRow('chg_other', 'Other (describe in section 5)')

  heading('3. Official Grant Account (complete only if changing payee details)')
  para(
    'Use an official school or organisation bank account for Fundraising Cashback Grant remittance and audit (D9/D10). Personal accounts are not accepted.',
    8
  )
  para(
    `Current on-file (masked): ABN ${safe(input.maskedAbn || '—')} | BSB ${safe(input.maskedBsb || '***-***')} | Acc ${safe(input.maskedAccount || '****')} | Name ${safe(input.payeeAccountName || '—')}`,
    8
  )
  addTextField({ name: 'bank_name', label: 'Bank name (optional)' })
  addTextField({ name: 'account_name', label: 'Account name * (if changing grant account)' })
  addTextField({ name: 'abn', label: 'ABN (11 digits) * (if changing grant account)' })
  addTextField({ name: 'bsb', label: 'BSB (6 digits) * (if changing grant account)' })
  addTextField({ name: 'account_number', label: 'Account number * (if changing grant account)' })

  heading('4. Contact details (complete only if changing contacts)')
  addTextField({ name: 'new_contact_name', label: 'New contact name' })
  addTextField({ name: 'new_contact_email', label: 'New contact email' })
  addTextField({ name: 'new_contact_phone', label: 'New phone' })

  heading('5. Notes / other')
  addTextField({ name: 'notes', label: 'Additional notes', height: 28, multiline: true })

  heading('6. Privacy, authority and Australian law notices')
  para(
    `Privacy Act 1988 (Cth) / APPs: ${company} collects this information to administer your Community Fundraising partnership, verify authorised instructions, and remit Fundraising Cashback Grants. Personal information is handled under our Privacy Policy and APP requirements (including security and destruction/de-identification under APP 11.2 when no longer needed, subject to legal retention).`,
    7.5
  )
  para(
    'Record retention: Grant remittance, bank transfer evidence, and related tax/business records are retained for periods Australian law requires (ATO guidance generally at least 5 years; longer where company record-keeping applies, commonly up to 7 years).',
    7.5
  )
  para(
    `Authority: By signing, you confirm you are authorised by ${org} to request these changes and that any Official Grant Account provided is an official organisation account for grant remittance and audit reporting.`,
    7.5
  )
  para(
    'No tax advice: This form does not constitute legal, tax or accounting advice. Your organisation remains responsible for its own ABN and bookkeeping treatment of grants.',
    7.5
  )
  para(
    'Confirmation: After SELPIC applies verified changes, we email Official Grant Account Update Confirmation (D16) to the organisation contact (masked details) and keep an internal admin alert (D17) plus a durable change history.',
    7.5
  )
  y += 2
  addCheckRow(
    'confirm_authority',
    `I confirm the information above is true and complete to the best of my knowledge, and I am authorised to submit this request on behalf of ${org}. *`
  )

  y += 4
  ensure(18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20)
  doc.text('Return path', margin, y)
  y += 5
  para(
    `1) Open Partner Lookup -> Documents and download this fillable D22 form. 2) Complete, save, then upload under Grant account -> Your change requests -> Reply & files. Support: ${support}`,
    8
  )

  y += 4
  ensure(8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120)
  doc.text(
    'Fillable AcroForm PDF generated for partner completion. Keep with your grant records.',
    margin,
    y
  )

  const dataUri = doc.output('datauristring') as string
  const b64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
  if (!b64 || !isPdfMagicBase64(b64)) {
    throw new Error('D22 fillable PDF generation failed')
  }
  return b64
}

function isPdfMagicBase64(b64: string): boolean {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').subarray(0, 5).toString().startsWith('%PDF')
    }
    const head = atob(b64.slice(0, 24))
    return head.startsWith('%PDF')
  } catch {
    return false
  }
}

export function downloadD22FillablePdf(input: D22FillablePdfInput, filename?: string): void {
  if (typeof window === 'undefined') {
    throw new Error('D22 fillable download is only available in the browser')
  }
  const b64 = buildD22FillablePdfBase64(input)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'SELPIC-D22-Partnership-Change-Request.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
