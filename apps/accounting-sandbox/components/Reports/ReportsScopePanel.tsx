'use client'

import { Calendar, Eye, Lock, Unlock } from 'lucide-react'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  buildLodgmentScopeSummary,
  isViewPeriodInsideRange,
  scopeModeLabel,
  type LodgmentScopeMode,
} from '@/lib/ato-lodgment/period-scope'
import type { FinancialPeriod } from '@/lib/storage/period-types'

interface ReportsScopePanelProps {
  transactions: Array<{ date: string }>
  periodStart: string
  periodEnd: string
  periodLabel: string
  financialPeriods: FinancialPeriod[]
  lockedPeriodIds: Set<string>
  viewPeriodId: string | null
  viewingPeriod: FinancialPeriod | null
  scopeMode: LodgmentScopeMode
  onScopeModeChange: (mode: LodgmentScopeMode) => void
  scopedTransactionCount: number
}

export function ReportsScopePanel({
  transactions,
  periodStart,
  periodEnd,
  periodLabel,
  financialPeriods,
  lockedPeriodIds,
  viewPeriodId,
  viewingPeriod,
  scopeMode,
  onScopeModeChange,
  scopedTransactionCount,
}: ReportsScopePanelProps) {
  const scopeSummary = buildLodgmentScopeSummary(
    transactions,
    periodStart,
    periodEnd,
    financialPeriods,
    lockedPeriodIds
  )

  const dashboardMonthInRange = isViewPeriodInsideRange(viewPeriodId, periodStart, periodEnd)

  return (
    <div className="card border-indigo-100 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Reports data scope</h3>
            {scopeSummary.allMonthsLocked && scopeSummary.totalInRange > 0 && (
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                All months locked
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {periodLabel} · {formatDateAustralian(periodStart)} –{' '}
            {formatDateAustralian(periodEnd)}
          </p>

          {viewPeriodId && (
            <p className="text-sm text-indigo-800 mb-2 flex items-center gap-1">
              <Eye className="w-4 h-4" />
              Dashboard period: <strong>{viewPeriodId}</strong>
              {viewingPeriod?.isLocked && (
                <span className="inline-flex items-center gap-1 text-red-700 text-xs ml-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {scopeSummary.months.map((m) => (
              <span
                key={m.periodId}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                  m.isLocked
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : m.hasTransactions
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {m.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {m.periodId}
                {m.transactionCount > 0 && (
                  <span className="opacity-70">({m.transactionCount})</span>
                )}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-600">
            Showing <strong>{scopedTransactionCount}</strong> of{' '}
            <strong>{scopeSummary.totalInRange}</strong> transactions ·{' '}
            {scopeModeLabel(scopeMode)}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            Same scope setting is shared with the ATO Lodgment tab.
          </p>
        </div>

        <div className="lg:w-64 shrink-0">
          <label className="block text-sm text-gray-600 mb-1">Data scope</label>
          <select
            value={scopeMode}
            onChange={(e) => onScopeModeChange(e.target.value as LodgmentScopeMode)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="full">Full reporting period</option>
            <option value="locked_only">Locked periods only</option>
            {viewPeriodId && dashboardMonthInRange && (
              <option value="dashboard_month">Dashboard month ({viewPeriodId})</option>
            )}
          </select>
          {scopeMode === 'locked_only' && (
            <p className="text-xs text-gray-500 mt-1">
              Matches closed months — same as ATO Lodgment.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
