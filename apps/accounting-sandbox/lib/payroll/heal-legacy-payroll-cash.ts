/**
 * Convert legacy payroll ASSET_CASH credits → wages payable (accrual model).
 */

import {
  isLegacyPayrollCashCredit,
  LIABILITY_WAGES_PAYABLE,
} from '@/src/features/payroll/bookkeeping'

export interface LegacyPayrollCashTx {
  id?: string
  source?: string
  category?: string
  credit?: number | null
  debit?: number | null
  description?: string
  payrollMeta?: Record<string, unknown>
  [key: string]: unknown
}

export function countLegacyPayrollCashCredits(
  transactions: LegacyPayrollCashTx[]
): number {
  return transactions.filter(isLegacyPayrollCashCredit).length
}

/** Pure transform — does not persist. */
export function healLegacyPayrollCashCreditTx<T extends LegacyPayrollCashTx>(
  tx: T
): T | null {
  if (!isLegacyPayrollCashCredit(tx)) return null
  return {
    ...tx,
    category: LIABILITY_WAGES_PAYABLE,
    description: String(tx.description || '')
      .replace(/^Net Pay\b/i, 'Wages payable (net) — healed from legacy cash')
      .replace(
        /Net Pay -/i,
        'Wages payable (net) -'
      ),
    payrollMeta: {
      ...(tx.payrollMeta || {}),
      journalKind: 'accrual',
      healedFromLegacyCash: true,
    },
  }
}
