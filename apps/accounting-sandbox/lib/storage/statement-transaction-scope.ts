/**
 * Keep each StoredStatement.transactions scoped to that bank file only.
 * Never write the merged History ledger (all statements + cash + payroll) back into one statement.
 */

import { buildTransactionFingerprint } from '@/lib/dashboard/transaction-dedupe'
import { normalizeDescription } from '@/lib/storage/user-mappings'

type PatchableTx = {
  id?: string
  date: string
  description: string
  debit?: number | null | undefined
  credit?: number | null | undefined
  balance?: number | null | undefined
}

/** Survives date corrections (fingerprint includes date). */
function softRowKey(tx: PatchableTx): string {
  const amount = Math.abs(Number(tx.debit || tx.credit || 0)).toFixed(2)
  const desc = normalizeDescription(tx.description || '')
  return `${amount}|${desc}`
}

function sameRow(a: PatchableTx, b: PatchableTx): boolean {
  if (a.id && b.id && a.id === b.id) return true
  return buildTransactionFingerprint(a) === buildTransactionFingerprint(b)
}

/**
 * Apply category/department/date/amount edits onto the statement's own rows only.
 * Does not add rows from other statements or cash/payroll.
 *
 * When the user corrects a date, the full fingerprint changes — fall back to a
 * unique amount+description match within the statement so Manual edits persist.
 */
export function patchStatementTransactions<T extends PatchableTx>(
  statementTransactions: T[],
  ledgerAfterEdit: T[]
): T[] {
  return statementTransactions.map((stx) => {
    const exact = ledgerAfterEdit.find((tx) => sameRow(stx, tx))
    if (exact) return { ...stx, ...exact } as T

    const soft = softRowKey(stx)
    const softMatches = ledgerAfterEdit.filter((tx) => softRowKey(tx) === soft)
    if (softMatches.length === 1) {
      return { ...stx, ...softMatches[0] } as T
    }

    return stx
  })
}

/**
 * If a statement was previously polluted with History, prefer rows inside the
 * statement period when that shrinks the set (heuristic repair for export).
 */
export function preferPeriodScopedRows<T extends { date: string }>(
  transactions: T[],
  period?: { startDate?: string; endDate?: string } | null
): T[] {
  const start = period?.startDate?.slice(0, 10)
  const end = period?.endDate?.slice(0, 10)
  if (!start || !end || transactions.length === 0) return transactions

  const inPeriod = transactions.filter((tx) => {
    const d = String(tx.date || '').slice(0, 10)
    return d >= start && d <= end
  })

  if (inPeriod.length > 0 && inPeriod.length < transactions.length) {
    return inPeriod
  }
  return transactions
}
