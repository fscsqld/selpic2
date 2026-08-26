/**
 * Learned merchant & director-loan rules for company bank statements.
 *
 * Director-name matching uses Settings → Director Name (any user).
 * Merchant patterns below are optional learned shortcuts; user mappings still win.
 */

import { descriptionMatchesDirector } from '@/lib/classification/director-name-match'

export interface SelpicCompanyRuleMatch {
  category: string
  department: 'cleaning'
  confidence: number
  reason: string
  isDirectorsLoan?: boolean
  swapDebitToCredit?: boolean
}

function normalise(description: string): string {
  return description.toUpperCase().replace(/\s+/g, ' ').trim()
}

function hasDebit(debit: number | null | undefined, credit: number | null | undefined): boolean {
  return !!(debit && Math.abs(debit) > 0 && !(credit && Math.abs(credit) > 0))
}

function hasCredit(credit: number | null | undefined, debit: number | null | undefined): boolean {
  return !!(credit && Math.abs(credit) > 0 && !(debit && Math.abs(debit) > 0))
}

const SUBCONTRACTOR_PATTERNS = [
  'MJR ENTERPRISE',
  'MJRENTERPRISE',
  'CYC COMPANY',
  'CYC COMPANY PTY',
  'FSCS PAYMENT',
]

const TRADING_REVENUE_CREDIT_PATTERNS = [
  'ASSOCIATED CLEANING',
  'ASSOCIATEDCLEANING',
  'ASSOCIATED CLEAN',
  'AK INNOVATION',
  'JASON SELPIC',
  'JASON FAMILY',
  'ASEEOS',
  'MALATANG',
]

export function detectSelpicCompanyRule(
  description: string,
  debit: number | null | undefined,
  credit: number | null | undefined,
  directorName?: string | null
): SelpicCompanyRuleMatch | null {
  const text = normalise(description)
  if (!text) return null

  const isDirector = descriptionMatchesDirector(description, directorName)

  // Share capital / initial shares issued (equity — not P&L, not director reimbursement)
  const isShareCapital =
    text.includes('SHARE CAPITAL') ||
    text.includes('SHARES ISSUED') ||
    text.includes('SHARES ISSUE') ||
    text.includes('INITIAL CAPITAL') ||
    (text.includes('INITIAL') && text.includes('CAPITAL')) ||
    (text.includes('SHARES') && text.includes('ISSUED')) ||
    (text.includes('CAPITAL') && /\b\d+\s*SHARES?\b/.test(text)) ||
    // Truncated NAB narratives: "Mr Jinsoo Kim Initial" (rest of "capital / shares issued" cut off)
    (isDirector && text.includes('INITIAL') && !text.includes('RETURN'))

  if (isShareCapital && (hasCredit(credit, debit) || hasDebit(debit, credit))) {
    return {
      category: 'EQUITY_SHARE_CAPITAL',
      department: 'cleaning',
      confidence: 0.98,
      reason: 'Initial share capital / shares issued — Balance Sheet equity (not income or reimbursement)',
      ...(hasDebit(debit, credit) ? { swapDebitToCredit: true } : {}),
    }
  }

  // Director's loan — capital injection (credit), or debit-column mis-parse → swap
  if (isDirector && text.includes('LOAN')) {
    if (hasCredit(credit, debit)) {
      return {
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        confidence: 0.98,
        reason: "Director's loan capital injection",
        isDirectorsLoan: true,
      }
    }
    if (hasDebit(debit, credit)) {
      return {
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        confidence: 0.98,
        reason: "Director's loan capital injection (debit column mis-parse)",
        isDirectorsLoan: true,
        swapDebitToCredit: true,
      }
    }
  }

  // Erroneous payment return (director + RETURN) — credit side, or debit mis-parse → swap
  if (isDirector && text.includes('RETURN')) {
    if (hasDebit(debit, credit)) {
      return {
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
        department: 'cleaning',
        confidence: 0.98,
        reason: 'Return of mistaken payment (debit column mis-parse)',
        swapDebitToCredit: true,
      }
    }
    if (hasCredit(credit, debit)) {
      return {
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
        department: 'cleaning',
        confidence: 0.98,
        reason: 'Return of mistaken payment to director',
      }
    }
  }

  // Erroneous payment out — director debit with mistake keywords, or Z-ref often paired with RETURN
  if (
    hasDebit(debit, credit) &&
    isDirector &&
    (text.includes('WRONG') ||
      text.includes('ERRONEOUS') ||
      text.includes('ACCIDENTAL') ||
      /\bZ\d{9,}\b/.test(text))
  ) {
    return {
      category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
      department: 'cleaning',
      confidence: 0.95,
      reason: 'Erroneous payment out (director return pair)',
    }
  }

  // Director prior-period reimbursement — company bank repays director
  // (personal spend already lodged in a prior period — not new P&L)
  // Exclude capital / shares / loan / return wording so share capital is never caught here.
  if (
    hasDebit(debit, credit) &&
    isDirector &&
    !text.includes('LOAN') &&
    !text.includes('RETURN') &&
    !text.includes('CAPITAL') &&
    !text.includes('SHARE') &&
    !text.includes('INITIAL')
  ) {
    return {
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
      confidence: 0.97,
      reason:
        'Reimbursement to director for prior-period personal expenses already reported — not new P&L or GST',
    }
  }

  // Subcontractors (debit)
  if (hasDebit(debit, credit)) {
    if (text === 'MJR' || SUBCONTRACTOR_PATTERNS.some((p) => text.includes(p))) {
      return {
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
        confidence: 0.96,
        reason: 'Cleaning subcontractor payment',
      }
    }
  }

  // Trading revenue credits
  if (hasCredit(credit, debit)) {
    if (TRADING_REVENUE_CREDIT_PATTERNS.some((p) => text.includes(p))) {
      return {
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
        confidence: 0.97,
        reason: 'Confirmed business trading revenue',
      }
    }
  }

  // Professional fees
  if (hasDebit(debit, credit) && text.includes('OKTAX')) {
    return {
      category: 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES',
      department: 'cleaning',
      confidence: 0.95,
      reason: 'Tax agent / accounting fees',
    }
  }

  // NAB / card international & bank fees (not office supplies)
  if (
    hasDebit(debit, credit) &&
    (text.includes('INTNL TRAN FEE') ||
      text.includes('INTNL TXN') ||
      text.includes('INTL TXN FEE') ||
      text.includes('INTERNATIONAL TRANSACTION FEE') ||
      text.includes('FOREIGN CURRENCY FEE') ||
      text.includes('FOREIGN TRANSACTION FEE') ||
      text.includes('CURRENCY CONVERSION FEE') ||
      text.includes('OVERSEAS TRANSACTION FEE') ||
      text.includes('CROSS BORDER FEE') ||
      text.includes('NAB INTNL') ||
      (text.includes('BANK FEE') && !text.includes('MERCHANT')))
  ) {
    return {
      category: 'EXPENSE_BANK_FEES_INTEREST',
      department: 'cleaning',
      confidence: 0.96,
      reason: 'Bank / international transaction fee',
    }
  }

  // Website hosting / domain (AU GST typically claimable)
  if (
    hasDebit(debit, credit) &&
    (text.includes('CRAZYDOMAINS') ||
      text.includes('CRAZY DOMAINS') ||
      text.includes('CRAZYDOMAIN') ||
      text.includes('WEBSITE HO'))
  ) {
    return {
      category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
      department: 'cleaning',
      confidence: 0.93,
      reason: 'Crazy Domains / website hosting',
    }
  }

  // Office supplies
  if (hasDebit(debit, credit) && (text.includes('TK MAXX') || text.includes('TKMAXX'))) {
    return {
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning',
      confidence: 0.9,
      reason: 'Office / retail supplies',
    }
  }

  // Marketing
  if (hasDebit(debit, credit) && text.includes('VISTAPRINT')) {
    return {
      category: 'EXPENSE_MARKETING',
      department: 'cleaning',
      confidence: 0.92,
      reason: 'Print marketing materials',
    }
  }

  // Fuel — Oom Energy / OCR typo "Oomenrgy"
  if (
    hasDebit(debit, credit) &&
    (text.includes('OOMENERGY') ||
      text.includes('OOM ENERGY') ||
      text.includes('OOMENRGY') ||
      text.includes('OOMEN'))
  ) {
    return {
      category: 'EXPENSE_FUEL_TRAVEL',
      department: 'cleaning',
      confidence: 0.92,
      reason: 'Fuel retailer: Oom Energy',
    }
  }

  // Google Australia — software subscription (not ads)
  if (
    hasDebit(debit, credit) &&
    text.includes('GOOGLE AUSTRALIA') &&
    !text.includes('ADS') &&
    !text.includes('ADWORD')
  ) {
    return {
      category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
      department: 'cleaning',
      confidence: 0.9,
      reason: 'Google Australia software / workspace subscription',
    }
  }

  // ATO GST refund mis-parsed as debit (generic ATO I002 pattern)
  if (
    hasDebit(debit, credit) &&
    text.includes('ATO') &&
    text.includes('I002')
  ) {
    return {
      category: 'NON_TAXABLE_ATO_GST_REFUND',
      department: 'cleaning',
      confidence: 0.98,
      reason: 'ATO GST/BAS refund (debit column mis-parse)',
      swapDebitToCredit: true,
    }
  }

  return null
}
