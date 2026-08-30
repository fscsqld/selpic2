'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { buildBasReconcileResult } from '@/lib/ato-lodgment/bas-lodgment-reconcile'

interface BasLodgmentReconcilePanelProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    source?: string
    gstInfo?: {
      isGSTIncluded?: boolean
      gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    }
  }>
  openingDirectorLoanBalance: number
  priorPeriodDirectorAdvances?: number
  accountType: 'company' | 'sole_trader'
  periodStart: string
  periodEnd: string
  periodLabel: string
  gstReportingCycle?: 'Monthly' | 'Quarterly'
  onOpenAtoLodgment?: () => void
}

export function BasLodgmentReconcilePanel({
  transactions,
  openingDirectorLoanBalance,
  priorPeriodDirectorAdvances,
  accountType,
  periodStart,
  periodEnd,
  periodLabel,
  gstReportingCycle = 'Quarterly',
  onOpenAtoLodgment,
}: BasLodgmentReconcilePanelProps) {
  const reconcile = useMemo(
    () =>
      buildBasReconcileResult({
        transactions,
        openingDirectorLoanBalance,
        priorPeriodDirectorAdvances,
        accountType,
        periodStart,
        periodEnd,
        periodLabel,
        periodType: gstReportingCycle === 'Monthly' ? 'monthly' : 'quarterly',
      }),
    [
      transactions,
      openingDirectorLoanBalance,
      priorPeriodDirectorAdvances,
      accountType,
      periodStart,
      periodEnd,
      periodLabel,
      gstReportingCycle,
    ]
  )

  return (
    <div
      className={`card border-2 ${
        reconcile.allOk ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2">
          {reconcile.allOk ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">BAS vs ATO Lodgment — {periodLabel}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Compares this Reports period with BAS fields on the ATO Lodgment tab (same calculation
              engine).
            </p>
          </div>
        </div>
        {onOpenAtoLodgment && (
          <button
            type="button"
            onClick={onOpenAtoLodgment}
            className="text-sm text-indigo-600 underline hover:text-indigo-800 flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" />
            Open ATO Lodgment
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4">Field</th>
              <th className="py-2 pr-4 text-right">Reports</th>
              <th className="py-2 pr-4 text-right">ATO Lodgment</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {reconcile.rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">
                  <span className="font-medium text-gray-800">{row.label}</span>
                  {row.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">{row.detail}</p>
                  )}
                </td>
                <td className="py-2 pr-4 text-right font-mono">{formatCurrency(row.reportsAmount)}</td>
                <td className="py-2 pr-4 text-right font-mono">
                  {formatCurrency(row.lodgmentAmount)}
                </td>
                <td className="py-2">
                  {row.ok ? (
                    <span className="text-green-700 text-xs font-medium">Match</span>
                  ) : (
                    <span className="text-amber-800 text-xs font-medium">Review</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
