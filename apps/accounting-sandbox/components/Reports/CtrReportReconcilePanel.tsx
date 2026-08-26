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

  const ctrIncome = ctr.fields.find((f) => f.id === 'CTR_6_TOTAL_INCOME')?.amount ?? 0
  const ctrExpenses = ctr.fields.find((f) => f.id === 'CTR_7_TOTAL_EXPENSES')?.amount ?? 0
  const ctrProfit = ctr.fields.find((f) => f.id === 'CTR_11_PROFIT_LOSS')?.amount ?? 0

  const incomeOk = Math.abs(metrics.totalIncome - ctrIncome) < 0.03
  const expensesOk = Math.abs(metrics.totalExpenses - ctrExpenses) < 0.03
  const profitOk = Math.abs(metrics.netProfit - ctrProfit) < 0.03
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
            Income statement totals compared with Company CTR lodgment fields (
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
          <dt className="text-gray-600">Total income</dt>
          <dd className="font-mono font-medium">
            Reports {formatCurrency(metrics.totalIncome)} / CTR {formatCurrency(ctrIncome)}
          </dd>
          <p className={`text-xs mt-1 ${incomeOk ? 'text-green-700' : 'text-amber-800'}`}>
            {incomeOk ? 'Match' : 'Review'}
          </p>
        </div>
        <div>
          <dt className="text-gray-600">Total expenses</dt>
          <dd className="font-mono font-medium">
            Reports {formatCurrency(metrics.totalExpenses)} / CTR {formatCurrency(ctrExpenses)}
          </dd>
          <p className={`text-xs mt-1 ${expensesOk ? 'text-green-700' : 'text-amber-800'}`}>
            {expensesOk ? 'Match' : 'Review'}
          </p>
        </div>
        <div>
          <dt className="text-gray-600">Profit or loss</dt>
          <dd className="font-mono font-medium">
            Reports {formatCurrency(metrics.netProfit)} / CTR {formatCurrency(ctrProfit)}
          </dd>
          <p className={`text-xs mt-1 ${profitOk ? 'text-green-700' : 'text-amber-800'}`}>
            {profitOk ? 'Match' : 'Review'}
          </p>
        </div>
      </dl>
    </div>
  )
}
