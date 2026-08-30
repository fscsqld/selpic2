/**
 * Chronological ordering for Transaction History (bank + Cash Expense).
 */

import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type ChronologySortableTx = {
  date: string
  source?: string
  id?: string
  description?: string
}

function isManualCashLike(tx: ChronologySortableTx): boolean {
  if (tx.source === 'manual') return true
  return String(tx.id || '').startsWith('cash_')
}

/**
 * Sort ledger rows by calendar date (ISO), earliest first.
 * Same day: bank statement lines keep relative order, then Cash Expense / manual.
 */
export function sortTransactionsChronologically<T extends ChronologySortableTx>(
  transactions: T[]
): T[] {
  return [...transactions]
    .map((tx, index) => ({ tx, index }))
    .sort((a, b) => {
      const da = toIsoDateString(a.tx.date) || String(a.tx.date || '')
      const db = toIsoDateString(b.tx.date) || String(b.tx.date || '')
      if (da !== db) return da.localeCompare(db)

      const aManual = isManualCashLike(a.tx) ? 1 : 0
      const bManual = isManualCashLike(b.tx) ? 1 : 0
      if (aManual !== bManual) return aManual - bManual

      return a.index - b.index
    })
    .map(({ tx }) => tx)
}
