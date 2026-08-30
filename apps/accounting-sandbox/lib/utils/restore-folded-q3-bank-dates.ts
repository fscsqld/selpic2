/**
 * Undo a bad persist that moved a real Q3 (Jan–Mar) bank statement into Apr–Jun.
 *
 * Symptom: Q3 History shows only cash (8), Q4 P&L period shows 55 while
 * “This statement” / the Q4 PDF parse is 50. The extra 5 are Q3 bank rows.
 */

import { normalizeDescription } from '@/lib/storage/user-mappings'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

type DatedTx = {
  date?: string
  description?: string
  debit?: number | null
  credit?: number | null
  id?: string
  source?: string
  isPayrollTransaction?: boolean
  statementId?: string
  balance?: number | null
}

function parseParts(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function monthOf(tx: DatedTx): number | null {
  const iso = toIsoDateString(tx.date)
  if (!iso) return null
  return parseParts(iso)?.m ?? null
}

function allMonthsIn(txs: DatedTx[], months: number[]): boolean {
  if (txs.length === 0) return false
  return txs.every((tx) => {
    const m = monthOf(tx)
    return m != null && months.includes(m)
  })
}

function countMonthsIn(txs: DatedTx[], months: number[]): number {
  return txs.filter((tx) => {
    const m = monthOf(tx)
    return m != null && months.includes(m)
  }).length
}

function isBankRow(tx: DatedTx): boolean {
  if (tx.source === 'manual' || tx.source === 'payroll' || tx.source === 'journal') {
    return false
  }
  if (tx.isPayrollTransaction) return false
  return !String(tx.id || '').startsWith('cash_')
}

/** Reverse the month+3 fold (Apr→Jan, May→Feb, Jun→Mar). */
export function shiftAprJunBackToJanMar(iso: string): string | null {
  const normalised = toIsoDateString(iso) || iso
  const p = parseParts(normalised)
  if (!p || p.m < 4 || p.m > 6) return null
  return `${p.y}-${String(p.m - 3).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

/**
 * Reverse US MM/DD swap first (01 Apr ← 04 Jan), else month+3 (14 Apr ← 14 Jan).
 */
export function reverseFoldedQ4DateToQ3(iso: string): string | null {
  const normalised = toIsoDateString(iso) || iso
  const p = parseParts(normalised)
  if (!p || p.m < 4 || p.m > 6) return null
  if (p.d >= 1 && p.d <= 12 && p.d !== p.m) {
    const swapped = `${p.y}-${String(p.d).padStart(2, '0')}-${String(p.m).padStart(2, '0')}`
    const sp = parseParts(swapped)
    if (sp && sp.m >= 1 && sp.m <= 3) return swapped
  }
  return shiftAprJunBackToJanMar(normalised)
}

function fingerprint(tx: DatedTx): string {
  const iso = toIsoDateString(tx.date) || String(tx.date || '')
  const amount = Math.abs(Number(tx.debit || tx.credit || 0)).toFixed(2)
  const desc = normalizeDescription(tx.description || '')
  return `${iso}|${amount}|${desc}`
}

export function periodLooksLikeBasQ3(period?: {
  startDate?: string
  endDate?: string
} | null): boolean {
  const s = toIsoDateString(period?.startDate || '')
  const e = toIsoDateString(period?.endDate || '')
  if (!s || !e) return false
  const sp = parseParts(s)
  const ep = parseParts(e)
  if (!sp || !ep) return false
  return sp.m >= 1 && sp.m <= 3 && ep.m >= 1 && ep.m <= 3
}

function applyReverseFold<T extends DatedTx>(txs: T[]): T[] | null {
  const out: T[] = []
  for (const tx of txs) {
    const iso = toIsoDateString(tx.date)
    if (!iso) return null
    const shifted = reverseFoldedQ4DateToQ3(iso)
    if (!shifted) return null
    out.push({ ...tx, date: shifted })
  }
  if (!allMonthsIn(out, [1, 2, 3])) return null
  return out
}

/**
 * Restore a small Q3 bank file whose rows were saved with Apr–Jun dates.
 * When a large Q4 statement exists, always unshift — overlapping fuel/freight
 * amounts must not block restore (that was why 5 rows stayed in Q4).
 */
export function restoreFoldedQ3BankDates<T extends DatedTx>(
  statementTxs: T[],
  otherStatementTxs: T[],
  period?: { startDate?: string; endDate?: string } | null
): T[] {
  const bank = statementTxs.filter(isBankRow)
  if (bank.length === 0 || bank.length > 20) return statementTxs
  if (!allMonthsIn(bank, [4, 5, 6])) return statementTxs

  const periodIsQ3 = periodLooksLikeBasQ3(period)
  const otherAprJun = countMonthsIn(otherStatementTxs.filter(isBankRow), [4, 5, 6])
  const otherIsLargeQ4 = otherAprJun >= 10

  const shifted = applyReverseFold(bank)
  if (!shifted) return statementTxs

  if (periodIsQ3 || otherIsLargeQ4) {
    return statementTxs.map((tx, i) => shifted[i] ?? tx)
  }

  return statementTxs
}

/**
 * Peel Q3 bank extras off the Q4 P&L window.
 * Canonical Q4 = the uploaded PDF (e.g. 50 rows). Ledger rows dated Apr–Jun
 * that are not on that file (the extra 5) go back to Jan–Mar.
 */
export function restoreBankRowsNotOnCanonicalQ4<T extends DatedTx>(
  ledger: T[],
  canonicalQ4: T[]
): T[] {
  const canonicalBank = canonicalQ4.filter(isBankRow)
  if (countMonthsIn(canonicalBank, [4, 5, 6]) < 10) return ledger

  const ids = new Set<string>()
  const fps = new Set<string>()
  for (const tx of canonicalBank) {
    if (tx.id) ids.add(String(tx.id))
    fps.add(fingerprint(tx))
  }

  const extras = ledger.filter((tx) => {
    if (!isBankRow(tx)) return false
    const iso = toIsoDateString(tx.date)
    if (!iso) return false
    const p = parseParts(iso)
    if (!p || p.m < 4 || p.m > 6) return false
    const id = String(tx.id || '')
    if (id && ids.has(id)) return false
    if (fps.has(fingerprint(tx))) return false
    return true
  })
  // A second overlapping Q4 statement has many extra ids — do not dump it into Q3.
  if (extras.length === 0 || extras.length > 15) return ledger

  const extraIds = new Set(extras.map((tx) => String(tx.id || '')).filter(Boolean))
  const extraRefs = new Set(extras)

  return ledger.map((tx) => {
    if (!extraRefs.has(tx) && !(tx.id && extraIds.has(String(tx.id)))) return tx
    const iso = toIsoDateString(tx.date)
    if (!iso) return tx
    const back = reverseFoldedQ4DateToQ3(iso)
    return back ? { ...tx, date: back } : tx
  })
}

/**
 * Single choke point: Q3 company bank + director cash stay in Jan–Mar.
 * A later “those P&L numbers look wrong” check must not fold the 5 bank
 * rows into Q4 (50 parsed vs 55 in P&L period).
 */
export function healCompanyLedgerDates<T extends DatedTx>(
  ledger: T[],
  canonicalQ4?: T[] | null
): T[] {
  const bank = ledger.filter(isBankRow)
  const groups = new Map<string, T[]>()
  for (const tx of bank) {
    const key = String(tx.statementId || '__none__')
    const list = groups.get(key) || []
    list.push(tx)
    groups.set(key, list)
  }

  let canonicalKey = '__none__'
  let canonicalCount = -1
  for (const [key, rows] of groups) {
    const n = countMonthsIn(rows, [4, 5, 6])
    if (n > canonicalCount) {
      canonicalCount = n
      canonicalKey = key
    }
  }

  const unshift = new Set<T>()
  if (canonicalCount >= 10) {
    for (const [key, rows] of groups) {
      if (key === canonicalKey) continue
      if (rows.length === 0 || rows.length > 20) continue
      if (!allMonthsIn(rows, [4, 5, 6])) continue
      for (const row of rows) unshift.add(row)
    }
  }

  const grouped = ledger.map((tx) => {
    if (!unshift.has(tx)) return tx
    const iso = toIsoDateString(tx.date)
    if (!iso) return tx
    const back = reverseFoldedQ4DateToQ3(iso)
    return back ? { ...tx, date: back } : tx
  })

  if (canonicalQ4 && canonicalQ4.length >= 10) {
    return restoreBankRowsNotOnCanonicalQ4(grouped, canonicalQ4)
  }
  if (canonicalCount >= 10) {
    return restoreBankRowsNotOnCanonicalQ4(grouped, groups.get(canonicalKey) || [])
  }
  return grouped
}
