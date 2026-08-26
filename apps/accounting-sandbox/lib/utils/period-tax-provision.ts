/**
 * Company tax provision for the **selected P&L period** (same ledger as Real-Time P&L).
 * Do not expand to the full FY when the banner is a BAS quarter.
 *
 * Cash P&L stays GST-inclusive; taxable income / provision use tax (ex-GST) estimates
 * (income − 1A, expenses − 1B) so GST-FREE purchases are not blindly ÷11.
 */

import {
  calculateBusinessMetrics,
  isPlExpenseDebit,
  type Transaction,
} from '@/lib/utils/business-calculations'

export interface PeriodTaxProvision {
  /** Tax / CTR-style estimate (ex GST) — used for provision */
  taxableIncome: number
  /** Cash / bank P&L (GST inclusive) */
  taxableIncomeCash: number
  revenue: number
  revenueExGst: number
  netExpenses: number
  netExpensesExGst: number
  taxProvision: number
  taxRatePercent: number
  txCount: number
  bankExpenseCount: number
  cashExpenseCount: number
}

function isManualCashRow(tx: { source?: string; id?: string }): boolean {
  return tx.source === 'manual' || String(tx.id || '').startsWith('cash_')
}

export function calculatePeriodTaxProvision(
  transactions: Transaction[],
  companyTaxRate: number,
  accountType: 'individual' | 'company' | 'sole_trader' = 'company',
  gstRegistered: boolean = true
): PeriodTaxProvision {
  const metrics = calculateBusinessMetrics(
    transactions,
    0,
    accountType,
    0,
    gstRegistered
  )
  const expenseRows = transactions.filter((tx) => isPlExpenseDebit(tx, accountType))
  const taxProvision =
    metrics.netProfitExGst > 0 ? metrics.netProfitExGst * companyTaxRate : 0

  return {
    taxableIncome: metrics.netProfitExGst,
    taxableIncomeCash: metrics.netProfit,
    revenue: metrics.totalIncome,
    revenueExGst: metrics.totalIncomeExGst,
    netExpenses: metrics.totalExpenses,
    netExpensesExGst: metrics.totalExpensesExGst,
    taxProvision,
    taxRatePercent: companyTaxRate * 100,
    txCount: transactions.length,
    bankExpenseCount: expenseRows.filter((tx) => !isManualCashRow(tx)).length,
    cashExpenseCount: expenseRows.filter((tx) => isManualCashRow(tx)).length,
  }
}
