'use client'

import { formatCurrency } from '@/lib/utils/currency-format'
import type { AnnualLodgmentResult } from '@/lib/ato-lodgment/types'

function fieldAmount(fields: AnnualLodgmentResult['fields'], id: string): number {
  return fields.find((f) => f.id === id)?.amount ?? 0
}

interface AnnualIncomeSummaryCardProps {
  result: AnnualLodgmentResult
}

/**
 * ATO lodgment P&L check — primary figures are GST-exclusive (tax basis).
 * Cash (GST-inclusive) shown for Biz Intel reconciliation.
 */
export function AnnualIncomeSummaryCard({ result }: AnnualIncomeSummaryCardProps) {
  const taxIncome =
    result.taxTotalIncome ??
    fieldAmount(result.fields, 'MYTAX_TOTAL_INCOME')
  const taxExpenses =
    result.taxTotalExpenses ??
    fieldAmount(result.fields, 'MYTAX_TOTAL_EXPENSES')
  const taxNet =
    result.taxNetProfit ??
    fieldAmount(result.fields, 'MYTAX_NET_INCOME') ??
    taxIncome - taxExpenses

  const cashIncome = result.cashTotalIncome
  const cashExpenses = result.cashTotalExpenses
  const cashNet = result.cashNetProfit
  const showCash =
    typeof cashIncome === 'number' &&
    typeof cashExpenses === 'number' &&
    (Math.abs(cashIncome - taxIncome) > 0.02 ||
      Math.abs(cashExpenses - taxExpenses) > 0.02)

  return (
    <div className="card border-indigo-100 bg-indigo-50/40 print:hidden">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        Annual P&amp;L check — FY {result.financialYear}
      </h3>
      <p className="text-xs text-gray-600 mb-1">
        {result.periodStart} → {result.periodEnd}
        {result.uncategorisedCount > 0
          ? ` · ${result.uncategorisedCount} uncategorised`
          : ''}
      </p>
      <p className="text-xs font-medium text-indigo-800 mb-3">
        ATO / tax basis (excluding GST) — copy these figures into myTax or CTR
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Total business income (ex GST)</p>
          <p className="font-mono font-semibold text-green-800">
            {formatCurrency(taxIncome)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Total business expenses (ex GST)</p>
          <p className="font-mono font-semibold text-red-800">
            {formatCurrency(taxExpenses)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            GST-FREE costs stay at face · claimable GST removed via 1B
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Net income or loss (ex GST)</p>
          <p
            className={`font-mono font-semibold ${
              taxNet >= 0 ? 'text-indigo-900' : 'text-amber-800'
            }`}
          >
            {formatCurrency(taxNet)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {formatCurrency(taxIncome)} − {formatCurrency(taxExpenses)}
          </p>
        </div>
      </div>

      {showCash && (
        <div className="mt-3 pt-3 border-t border-indigo-100 text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-1">
            Biz Intel cash (GST-inclusive) — bank reconciliation only
          </p>
          <p>
            Income {formatCurrency(cashIncome)} · Expenses{' '}
            {formatCurrency(cashExpenses)} · Net {formatCurrency(cashNet)}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Tax net ≈ cash net − (1A − 1B). Do not paste cash totals into the company
            tax return.
          </p>
        </div>
      )}
    </div>
  )
}
