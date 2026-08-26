/**
 * Australian ABA (Direct Entry) file builder for staff net-pay batches (Phase 5).
 * Fixed-width 120-character records. Validate with your bank before live use.
 */

export interface AbaSelfAccount {
  /** 3-letter APCA code e.g. NAB, CBA, WBC, ANZ */
  financialInstitution: string
  /** User preferred / company name (max 26) */
  userName: string
  /** 6-digit user ID (banks issue; use 000000 if unknown) */
  userIdNumber?: string
  /** Trace BSB e.g. 084-034 */
  bsb: string
  /** Trace / funding account number */
  accountNumber: string
  remitterName?: string
}

export interface AbaPaymentLine {
  bsb: string
  accountNumber: string
  accountName: string
  amount: number
  lodgementReference?: string
  /** Transaction code — 53 = Pay (default) */
  transactionCode?: string
}

function padRight(s: string, len: number): string {
  const t = String(s || '').slice(0, len)
  return t + ' '.repeat(Math.max(0, len - t.length))
}

function padLeft(s: string, len: number, ch = '0'): string {
  const t = String(s || '').slice(-len)
  return ch.repeat(Math.max(0, len - t.length)) + t
}

/** Normalize to XXX-XXX */
export function formatAbaBsb(bsb: string): string {
  const d = String(bsb || '').replace(/\D/g, '')
  if (d.length !== 6) return padRight(String(bsb || '').replace(/\s/g, ''), 7)
  return `${d.slice(0, 3)}-${d.slice(3)}`
}

export function dollarsToAbaCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100)
}

function processDateDdmmyy(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

function assertLineLen(line: string, label: string): string {
  if (line.length !== 120) {
    throw new Error(`${label} length ${line.length} (expected 120)`)
  }
  return line
}

export function buildAbaDescriptiveRecord(
  self: AbaSelfAccount,
  description = 'PAYROLL',
  processDate: Date = new Date()
): string {
  const fi = padRight(self.financialInstitution.toUpperCase(), 3)
  const userName = padRight(self.userName.toUpperCase(), 26)
  const userId = padLeft((self.userIdNumber || '000000').replace(/\D/g, ''), 6)
  const desc = padRight(description.toUpperCase(), 12)
  const date = processDateDdmmyy(processDate)

  const line =
    '0' +
    ' '.repeat(17) +
    '01' +
    fi +
    ' '.repeat(7) +
    userName +
    userId +
    desc +
    date +
    ' '.repeat(40)

  return assertLineLen(line, 'Descriptive')
}

export function buildAbaDetailRecord(
  payment: AbaPaymentLine,
  self: AbaSelfAccount
): string {
  const bsb = formatAbaBsb(payment.bsb)
  const acct = padLeft(String(payment.accountNumber || '').replace(/\s/g, ''), 9, ' ')
  const indicator = ' '
  const txnCode = padLeft(payment.transactionCode || '53', 2)
  const cents = padLeft(String(dollarsToAbaCents(payment.amount)), 10)
  const title = padRight(payment.accountName.toUpperCase(), 32)
  const lodgement = padRight(
    (payment.lodgementReference || 'SALARY').toUpperCase(),
    18
  )
  const traceBsb = formatAbaBsb(self.bsb)
  const traceAcct = padLeft(String(self.accountNumber || '').replace(/\s/g, ''), 9, ' ')
  const remitter = padRight(
    (self.remitterName || self.userName).toUpperCase(),
    16
  )
  const withholding = '00000000'

  const line =
    '1' +
    bsb +
    acct +
    indicator +
    txnCode +
    cents +
    title +
    lodgement +
    traceBsb +
    traceAcct +
    remitter +
    withholding

  return assertLineLen(line, 'Detail')
}

export function buildAbaFileTotalRecord(
  detailCount: number,
  creditCents: number,
  debitCents = 0
): string {
  const net = Math.abs(creditCents - debitCents)
  const line =
    '7' +
    '999-999' +
    ' '.repeat(12) +
    padLeft(String(net), 10) +
    padLeft(String(creditCents), 10) +
    padLeft(String(debitCents), 10) +
    ' '.repeat(24) +
    padLeft(String(detailCount), 6) +
    ' '.repeat(40)

  return assertLineLen(line, 'File total')
}

export function buildAbaFile(
  self: AbaSelfAccount,
  payments: AbaPaymentLine[],
  options?: { description?: string; processDate?: Date }
): string {
  const valid = payments.filter((p) => p.amount > 0 && p.bsb && p.accountNumber)
  if (valid.length === 0) {
    throw new Error('No valid ABA payment lines (need BSB, account, amount > 0)')
  }

  const lines: string[] = [
    buildAbaDescriptiveRecord(
      self,
      options?.description || 'PAYROLL',
      options?.processDate
    ),
  ]

  let creditCents = 0
  for (const p of valid) {
    lines.push(buildAbaDetailRecord(p, self))
    creditCents += dollarsToAbaCents(p.amount)
  }

  lines.push(buildAbaFileTotalRecord(valid.length, creditCents, 0))
  return lines.join('\r\n') + '\r\n'
}

export function inferFinancialInstitutionFromBsb(bsb: string): string {
  const d = String(bsb || '').replace(/\D/g, '')
  if (!d) return 'NAB'
  // Coarse APCA-style hints from BSB first digit ranges (not exhaustive)
  const n = Number(d.slice(0, 2))
  if (n >= 1 && n <= 3) return 'ANZ'
  if (n >= 6 && n <= 7) return 'CBA'
  if (n >= 8 && n <= 9) return 'NAB'
  if (n >= 3 && n <= 4) return 'WBC'
  return 'NAB'
}
