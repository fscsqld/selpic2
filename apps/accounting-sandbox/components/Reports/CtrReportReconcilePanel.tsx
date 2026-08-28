'use client'

import { useMemo } from 'react'
import { Link2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { computeCtrLodgment } from '@/lib/ato-lodgment/compute-lodgment'
import { companyTaxRateLabel } from '@/lib/ato-lodgment/business-profile-tax'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

interface CtrReportReconcilePanelProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
  }>
  openingDirectorLoanBalance: number
  financialYear: string
  companyTaxRate: number
  onOpenAtoLodgment?: () => void
}

export function CtrReportReconcilePanel({
  transactions,
  openingDirectorLoanBalance,
  financialYear,
  companyTaxRate,
  onOpenAtoLodgment,
}: CtrReportReconcilePanelProps) {
  const metrics = useMemo(
    () => calculateBusinessMetrics(transactions, openingDirectorLoanBalance, 'company'),
    [transactions, openingDirectorLoanBalance]
  )

  const ctr = useMemo(
    () =>
      computeCtrLodgment(transactions, openingDirectorLoanBalance, financialYear, {
        taxRate: companyTaxRate,
      }),
    [transactions, openingDirectorLoanBalance, financialYear, companyTaxRate]
  )

  const ctrIncome = ctr.fields.find((f) => f.id === 'CTR_6S_TOTAL_INCOME')?.amount ?? 0
  const ctrExpenses = ctr.fields.find((f) => f.id === 'CTR_6Q_TOTAL_EXPENSES')?.amount ?? 0
  const ctrProfitField = ctr.fields.find((f) => f.id === 'CTR_6T_PROFIT_LOSS')
  const ctrProfitLoss = ctrProfitField?.label.includes('(L)')
    ? -(ctrProfitField?.amount ?? 0)
    : ctrProfitField?.amount ?? 0

  const ledger = ctr.item6LedgerCents
  const ctrIncomeLedger = ledger?.totalIncome ?? metrics.totalIncomeExGst
  const ctrExpensesLedger = ledger?.totalExpenses ?? metrics.totalExpensesExGst
  const ctrProfitLedger = ledger?.profitOrLoss ?? metrics.netProfitExGst

  const incomeOk = Math.abs(ctrIncomeLedger - ctrIncome) <= 1.02
  const expensesOk = Math.abs(ctrExpensesLedger - ctrExpenses) <= 1.02
  const profitOk = Math.abs(Math.abs(ctrProfitLedger) - Math.abs(ctrProfitLoss)) <= 1.02
  const allOk = incomeOk && expensesOk && profitOk

  return (
    <div
      className={`card border-2 ${
        allOk ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">CTR vs financial summary — FY {financialYear}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Tax basis (ex GST, cents) vs CTR Item 6 ATO whole dollars (
            {companyTaxRateLabel(companyTaxRate)}).
          </p>
        </div>
        {onOpenAtoLodgment && (
          <button
            type="button"
            onClick={onOpenAtoLodgment}
            className="text-sm text-indigo-600 underline hover:text-indigo-800 flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" />
            Open ATO Lodgment → CTR
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-gray-600">Total income (ex GST)</dt>
          <dd className="font-mono font-medium">
            Ledger {formatCurrency(ctrIncomeLedger)} / CTR {formatCurrency(ctrIncome)}
          </dd>
          <p className={`text-xs mt-1 ${incomeOk ? 'text-green-700' : 'text-amber-800'}`}>
            {incomeOk ? 'Match' : 'Review'}
          </p>
        </div>
        <div>
          <dt className="text-gray-600">Total expenses (ex GST)</dt>
          <dd className="font-mono font-medium">
            Ledger {formatCurrency(ctrExpensesLedger)} / CTR {formatCurrency(ctrExpenses)}
          </dd>
          <p className={`text-xs mt-1 ${expensesOk ? 'text-green-700' : 'text-amber-800'}`}>
            {expensesOk ? 'Match' : 'Review'}
          </p>
        </div>
        <div>
          <dt className="text-gray-600">Profit or loss (ex GST)</dt>
          <dd className="font-mono font-medium">
            Ledger {formatCurrency(ctrProfitLedger)} / CTR {formatCurrency(ctrProfitLoss)}
          </dd>
          <p className={`text-xs mt-1 ${profitOk ? 'text-green-700' : 'text-amber-800'}`}>
            {profitOk ? 'Match' : 'Review'}
          </p>
        </div>
      </dl>
    </div>
  )
}
