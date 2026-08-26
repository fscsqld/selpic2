/**
 * Prepare ledger rows for BAS / Annual / CTR.
 *
 * Date repair (OCR year slips, US↔AU swaps) is for **bank statement** rows only.
 * Manual Cash Expenses must never enter that pipeline — same-day same-merchant
 * cash purchases (e.g. two Stamp zone lines) are real costs, not OCR clones.
 * Running repair on bank+cash together understated Annual/CTR vs Biz Intel FY.
 */

import { filterBankStatementTransactionsForLodgment } from '@/lib/ato-lodgment/lodgment-transaction-filter'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'

export function prepareLodgmentTransactions<
  T extends {
    date: string
    source?: string
    id?: string
    isPayrollTransaction?: boolean
    description?: string
    category?: string
  },
>(transactions: T[]): T[] {
  const bankAndCash = filterBankStatementTransactionsForLodgment(transactions)
  const cash = bankAndCash.filter((tx) => isManualCashExpenseTx(tx))
  const bank = bankAndCash.filter((tx) => !isManualCashExpenseTx(tx))
  const repairedBank = repairUsMisparsedAustralianDates(
    repairStatementDateAnomalies(bank)
  )
  return [...repairedBank, ...cash]
}
