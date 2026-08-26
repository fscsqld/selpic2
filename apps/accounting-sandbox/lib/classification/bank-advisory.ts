/**
 * Bank statement advisory / notice lines (not real ledger transactions).
 * e.g. NAB "PLEASE NOTE FROM TODAY YOUR DR INTEREST RATE IS 15.410%"
 * where 15.41 may be mis-parsed from the rate percentage as a credit.
 *
 * Also strips NAB/Westpac-style Transaction Listing footers that PDF extractors
 * glue onto the previous merchant line (e.g. "BP (Wishart) Page 1 of 2 Important…").
 */

import type { BankTransaction } from '@/lib/pdf-parser/types'

function normalise(description: string): string {
  return description.toUpperCase().replace(/\s+/g, ' ')
}

/** Phrases that start bank PDF legal / listing boilerplate (cut description here). */
const BOILERPLATE_CUT_MARKERS: RegExp[] = [
  /\bPage\s+\d+\s+of\s+\d+\b/i,
  /\bImportant\s+This\s+Transaction\s+Listing\b/i,
  /\bThis\s+Transaction\s+Listing\s+is\s+not\s+a\s+statement\b/i,
  /\bnot\s+a\s+statement\s+of\s+account\b/i,
  /\bNational\s+Australia\s+Bank\s+Limited\s+ABN\b/i,
  /\bAFSL\s+and\s+Australian\s+Credit\s+Licen[cs]e\b/i,
  /\bDepending\s+on\s+selected\s+date\s+range\b/i,
  /\bWith\s+the\s+exception\s+of\s+cheque\s+serial\s+numbers\b/i,
  /\bA\s+debit\s+does\s+not\s+always\s+indicate\b/i,
]

/** Narrative-only notices — never income, expense, or interest. */
export function isBankAdvisoryNotice(description: string): boolean {
  const d = normalise(description)
  if (!d) return false

  if (d.includes('PLEASE NOTE')) return true
  if (d.includes('FROM TODAY YOUR')) return true
  if (d.includes('INTEREST RATE IS')) return true
  if (d.includes('YOUR DR INTEREST RATE')) return true
  if (d.includes('YOUR CR INTEREST RATE')) return true
  if (d.includes('DR INTEREST RATE')) return true
  if (d.includes('CR INTEREST RATE')) return true
  // Pure footer line with no merchant left after strip
  const stripped = stripBankStatementBoilerplate(description)
  if (stripped.length === 0 && description.trim().length > 20) return true

  return false
}

/**
 * True when a PDF line is (almost) only statement boilerplate — do not append
 * as a multi-line continuation of the previous merchant.
 */
export function isBankStatementBoilerplateLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length < 20) return false
  const d = normalise(t)
  if (d.startsWith('PAGE ') && d.includes(' OF ')) return true
  if (d.startsWith('IMPORTANT THIS TRANSACTION LISTING')) return true
  if (d.includes('THIS TRANSACTION LISTING IS NOT A STATEMENT')) return true
  if (d.startsWith('NATIONAL AUSTRALIA BANK LIMITED ABN')) return true
  if (d.includes('AFSL AND AUSTRALIAN CREDIT LICEN')) return true
  // Mostly boilerplate if a cut marker appears in the first ~40 chars
  for (const re of BOILERPLATE_CUT_MARKERS) {
    const m = t.match(re)
    if (m && m.index != null && m.index < 48) return true
  }
  return false
}

/**
 * Remove bank PDF footers glued onto merchant particulars.
 * "BP (Wishart) Page 1 of 2 Important This Transaction Listing…" → "BP (Wishart)"
 */
export function stripBankStatementBoilerplate(description: string): string {
  if (!description) return ''
  let out = description.trim()
  let cutAt = out.length
  for (const re of BOILERPLATE_CUT_MARKERS) {
    const m = out.match(re)
    if (m && m.index != null && m.index < cutAt) {
      cutAt = m.index
    }
  }
  if (cutAt < out.length) {
    out = out.slice(0, cutAt).trim()
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Credit amount that matches a rate percentage prefix (e.g. 15.410% → $15.41).
 */
export function isLikelyRatePercentAmountArtifact(
  description: string,
  credit: number | null | undefined
): boolean {
  if (!credit || credit <= 0) return false
  const d = normalise(description)
  const rateMatch = d.match(/(\d{1,2}\.\d{2,3})\s*%/)
  if (!rateMatch) return false
  const ratePrefix = parseFloat(rateMatch[1])
  if (!Number.isFinite(ratePrefix)) return false
  return Math.abs(credit - ratePrefix) < 0.02
}

export function shouldExcludeBankAdvisoryTransaction(
  tx: Pick<BankTransaction, 'description' | 'debit' | 'credit'>
): boolean {
  const desc = tx.description || ''
  if (!isBankAdvisoryNotice(desc)) return false
  // Advisory notices are never real money movements — drop even if amount is zero.
  return true
}

export function filterBankAdvisoryTransactions<T extends Pick<BankTransaction, 'description' | 'debit' | 'credit'>>(
  transactions: T[]
): T[] {
  return transactions.filter((tx) => !shouldExcludeBankAdvisoryTransaction(tx))
}

/** Apply boilerplate strip to every bank row (display + new parses). */
export function sanitizeBankTransactionDescriptions<
  T extends { description?: string; source?: string }
>(transactions: T[]): T[] {
  return transactions.map((tx) => {
    if (tx.source === 'manual' || tx.source === 'payroll' || tx.source === 'journal') {
      return tx
    }
    const next = stripBankStatementBoilerplate(String(tx.description || ''))
    if (next === (tx.description || '')) return tx
    return { ...tx, description: next }
  })
}
