'use client'

import { useMemo } from 'react'
import { Calendar, Lock } from 'lucide-react'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { getAustralianFinancialYear } from '@/lib/utils/australian-financial-year'
import {
  filterTransactionsForDateRange,
  formatViewPeriodLabel,
  listBasQuarterOptions,
  financialYearToViewPeriod,
  monthPeriodIdToRange,
  statementRangeFromTransactions,
  type DashboardViewPeriod,
} from '@/lib/dashboard/view-period-range'
import { getDistinctPeriodIdsFromTransactions } from '@/lib/dashboard/transaction-history-ui'
import type { FinancialPeriod } from '@/lib/storage/period-types'

interface DashboardPeriodSelectorProps {
  viewPeriod: DashboardViewPeriod
  onChangeViewPeriod: (period: DashboardViewPeriod) => void
  transactions: Array<{ date: string }>
  dashboardTransactionCount: number
  viewingPeriod: FinancialPeriod | null
  lockedPeriodIds: Set<string>
}

function formatMonthOptionLabel(periodId: string): string {
  const [y, m] = periodId.split('-').map(Number)
  if (!y || !m) return periodId
  return new Date(y, m - 1, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })
}

function formatFyOptionLabel(fy: string): string {
  const [a, b] = fy.split('-')
  if (a && b?.length === 4) return `FY ${a}–${b.slice(2)} (Jul–Jun)`
  return `FY ${fy} (Jul–Jun)`
}

export function DashboardPeriodSelector({
  viewPeriod,
  onChangeViewPeriod,
  transactions,
  dashboardTransactionCount,
  viewingPeriod,
  lockedPeriodIds: _lockedPeriodIds,
}: DashboardPeriodSelectorProps) {
  // Keep the selected period's FY listed even when the ledger has no rows for it,
  // otherwise the control silently falls back to "Custom range".
  const basOptions = useMemo(
    () => listBasQuarterOptions(transactions, new Date(), [viewPeriod.financialYear]),
    [transactions, viewPeriod.financialYear]
  )
  const monthIds = useMemo(
    () => getDistinctPeriodIdsFromTransactions(transactions),
    [transactions]
  )

  const statementRange = useMemo(
    () => statementRangeFromTransactions(transactions),
    [transactions]
  )

  const fyForSelector = useMemo(() => {
    if (viewPeriod.financialYear) return viewPeriod.financialYear
    if (statementRange?.startDate) {
      return getAustralianFinancialYear(new Date(`${statementRange.startDate}T12:00:00`))
    }
    if (viewPeriod.startDate) {
      return getAustralianFinancialYear(new Date(`${viewPeriod.startDate}T12:00:00`))
    }
    return getAustralianFinancialYear(new Date())
  }, [viewPeriod.financialYear, viewPeriod.startDate, statementRange])

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      onChangeViewPeriod({ ...viewPeriod, preset: 'custom' })
      return
    }
    if (value === 'financial_year') {
      onChangeViewPeriod(financialYearToViewPeriod(fyForSelector))
      return
    }
    if (value === 'statement' && statementRange) {
      onChangeViewPeriod(statementRange)
      return
    }
    if (value.startsWith('bas:')) {
      const [, fy, q] = value.split(':')
      const quarter = Number(q) as 1 | 2 | 3 | 4
      const match = basOptions.find((o) => o.key === `${fy}-q${quarter}`)
      if (match) onChangeViewPeriod(match.period)
      return
    }
    if (value.startsWith('month:')) {
      const periodId = value.replace('month:', '')
      onChangeViewPeriod(monthPeriodIdToRange(periodId))
    }
  }

  const selectedPresetValue = useMemo(() => {
    if (viewPeriod.preset === 'month' && viewPeriod.monthPeriodId) {
      return `month:${viewPeriod.monthPeriodId}`
    }
    if (viewPeriod.preset === 'financial_year') {
      return 'financial_year'
    }
    if (viewPeriod.preset === 'statement') {
      return 'statement'
    }
    if (viewPeriod.preset.startsWith('bas_')) {
      const q = viewPeriod.preset.replace('bas_q', '')
      const fy =
        viewPeriod.financialYear ||
        getAustralianFinancialYear(new Date(`${viewPeriod.startDate}T12:00:00`))
      const key = `bas:${fy}:${q}`
      // If stored FY doesn't match an option, fall back to custom so the control isn't blank
      const exists = basOptions.some(
        (o) => `bas:${o.period.financialYear}:${o.period.preset.replace('bas_q', '')}` === key
      )
      return exists ? key : 'custom'
    }
    return 'custom'
  }, [viewPeriod, basOptions])

  return (
    <div className="card mb-6 border-indigo-200 bg-indigo-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-indigo-900">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 shrink-0" />
            <span className="font-medium">P&amp;L period</span>
          </div>
          <select
            value={selectedPresetValue}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="text-sm font-semibold border border-indigo-300 rounded-md px-2 py-1.5 bg-white text-indigo-900 min-w-[12rem]"
            aria-label="Select P and L period"
          >
            <optgroup label="BAS quarter">
              {basOptions.map((opt) => (
                <option
                  key={opt.key}
                  value={`bas:${opt.period.financialYear}:${opt.period.preset.replace('bas_q', '')}`}
                  disabled={opt.txCount === 0}
                >
                  {opt.label}
                </option>
              ))}
            </optgroup>
            {statementRange && (
              <option value="statement">
                Full statement · {formatDateAustralian(statementRange.startDate)} –{' '}
                {formatDateAustralian(statementRange.endDate)}
              </option>
            )}
            <option value="financial_year">{formatFyOptionLabel(fyForSelector)}</option>
            {monthIds.length > 0 && (
              <optgroup label="Month">
                {monthIds.map((pid) => (
                  <option key={pid} value={`month:${pid}`}>
                    {formatMonthOptionLabel(pid)}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="custom">Custom range</option>
          </select>
          {viewingPeriod?.isLocked && (
            <span className="inline-flex items-center gap-1 text-red-700 text-sm">
              <Lock className="w-4 h-4" />
              Locked
            </span>
          )}
        </div>
        <p className="text-sm text-indigo-800">
          <strong>{dashboardTransactionCount}</strong>
          {dashboardTransactionCount === 1 ? ' transaction' : ' transactions'}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-indigo-700 mb-1">From</label>
          <input
            type="date"
            value={viewPeriod.startDate}
            onChange={(e) =>
              onChangeViewPeriod({
                ...viewPeriod,
                preset: 'custom',
                startDate: e.target.value,
              })
            }
            className="text-sm border border-indigo-300 rounded-md px-2 py-1 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-indigo-700 mb-1">To</label>
          <input
            type="date"
            value={viewPeriod.endDate}
            min={viewPeriod.startDate}
            onChange={(e) =>
              onChangeViewPeriod({
                ...viewPeriod,
                preset: 'custom',
                endDate: e.target.value,
              })
            }
            className="text-sm border border-indigo-300 rounded-md px-2 py-1 bg-white"
          />
        </div>
        <p className="text-sm text-indigo-900 pb-1.5">{formatViewPeriodLabel(viewPeriod)}</p>
      </div>
    </div>
  )
}
