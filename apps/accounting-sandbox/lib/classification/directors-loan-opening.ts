/**
 * Director's Loan opening at the start of a Biz Intel / report date window.
 * Roll Settings opening through all ledger activity strictly before `startDateIso`.
 */

import {
  calculateBusinessMetrics,
  type Transaction,
} from '@/lib/utils/business-calculations'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export function transactionsBeforeDate<T extends { date: string }>(
  transactions: T[],
  startDateIso: string
): T[] {
  const start = toIsoDateString(startDateIso) || startDateIso
  return transactions.filter((tx) => {
    const d = toIsoDateString(tx.date)
    return !!d && d < start
  })
}

/**
 * Opening DL for [startDateIso, end] = Settings opening + DL movement on txs with date < start.
 * Prior plug = 0 here — pre-window history is already in the roll-forward.
 */
export function computeDirectorsLoanOpeningAtRangeStart(
  allTransactions: Transaction[],
  settingsOpening: number,
  accountType: 'individual' | 'company' | 'sole_trader',
  startDateIso: string
): number {
  const before = transactionsBeforeDate(allTransactions, startDateIso)
  return calculateBusinessMetrics(before, settingsOpening, accountType, 0).directorsLoanBalance
}
