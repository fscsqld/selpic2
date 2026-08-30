/**
 * Manual Cash Expense rows (Add Cash Expense) vs bank statement lines.
 * Only these may be removed via single-delete UI — never bank PDF rows.
 */

export function isManualCashExpenseRow(tx: {
  id?: string | null
  source?: string | null
}): boolean {
  if (tx.source === 'manual') return true
  if (typeof tx.id === 'string' && tx.id.startsWith('cash_')) return true
  return false
}

/** Stable IndexedDB key for deleteCashExpense (not the table `${id}_${index}` view key). */
export function resolveCashExpenseId(tx: {
  id?: string | null
  source?: string | null
}): string | null {
  if (!isManualCashExpenseRow(tx)) return null
  if (typeof tx.id === 'string' && tx.id.trim().length > 0) return tx.id.trim()
  return null
}
