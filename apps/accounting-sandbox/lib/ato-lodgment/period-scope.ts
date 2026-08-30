/**
 * ATO Lodgment ↔ Period Management integration.
 * Scopes ledger transactions to reporting ranges, locked months, or dashboard view.
 */

import type { FinancialPeriod } from '@/lib/storage/period-types'
import {
  filterTransactionsForPeriod,
  generatePeriodIdFromDateString,
} from '@/lib/period-management/period-lock'
import {
  closePeriodAndCarryForward,
  generatePeriodId,
} from '@/lib/period-management/period-utils'
import { preparePeriodForClose } from '@/lib/period-management/period-lock'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type LodgmentScopeMode = 'full' | 'locked_only' | 'dashboard_month'

export const ACCOUNTING_SCOPE_MODE_KEY = 'selpic_accounting_scope_mode'
export const ACCOUNTING_SCOPE_MODE_CHANGED = 'accountingScopeModeChanged'

export function getStoredScopeMode(): LodgmentScopeMode {
  if (typeof window === 'undefined') return 'full'
  const stored = localStorage.getItem(ACCOUNTING_SCOPE_MODE_KEY)
  if (stored === 'locked_only' || stored === 'dashboard_month') return stored
  return 'full'
}

export function setStoredScopeMode(mode: LodgmentScopeMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCOUNTING_SCOPE_MODE_KEY, mode)
  window.dispatchEvent(
    new CustomEvent(ACCOUNTING_SCOPE_MODE_CHANGED, { detail: { mode } })
  )
}

export interface MonthLockStatus {
  periodId: string
  isLocked: boolean
  transactionCount: number
  hasTransactions: boolean
}

export interface LodgmentPeriodScopeSummary {
  periodStart: string
  periodEnd: string
  months: MonthLockStatus[]
  allMonthsLocked: boolean
  anyOpenWithTransactions: boolean
  lockedTransactionCount: number
  openTransactionCount: number
  totalInRange: number
  openMonthIds: string[]
}

export function listMonthPeriodIdsInRange(startDate: string, endDate: string): string[] {
  const ids: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= end) {
    ids.push(generatePeriodId(cursor))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return ids
}

/**
 * Inclusive YYYY-MM-DD filter — same as Biz Intel / compute-lodgment.
 * Never use `new Date(tx.date)` (AU DD/MM/YYYY misparses as US MM/DD).
 */
function filterByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string
): T[] {
  const startIso = toIsoDateString(start) || start
  const endIso = toIsoDateString(end) || end
  return items.filter((tx) => {
    const d = toIsoDateString(tx.date)
    if (!d) return false
    return d >= startIso && d <= endIso
  })
}

export function buildLodgmentScopeSummary(
  transactions: Array<{ date: string }>,
  periodStart: string,
  periodEnd: string,
  periods: FinancialPeriod[],
  lockedPeriodIds: Set<string>
): LodgmentPeriodScopeSummary {
  const periodMap = new Map(periods.map((p) => [p.id, p]))
  const monthIds = listMonthPeriodIdsInRange(periodStart, periodEnd)

  const months: MonthLockStatus[] = monthIds.map((periodId) => {
    const periodTxs = filterTransactionsForPeriod(transactions, periodId)
    const isLocked =
      lockedPeriodIds.has(periodId) || periodMap.get(periodId)?.isLocked === true
    return {
      periodId,
      isLocked,
      transactionCount: periodTxs.length,
      hasTransactions: periodTxs.length > 0,
    }
  })

  const inRange = filterByDateRange(transactions, periodStart, periodEnd)
  const lockedOnly = inRange.filter((tx) =>
    lockedPeriodIds.has(generatePeriodIdFromDateString(tx.date))
  )
  const openOnly = inRange.filter(
    (tx) => !lockedPeriodIds.has(generatePeriodIdFromDateString(tx.date))
  )

  const openMonthIds = months.filter((m) => !m.isLocked).map((m) => m.periodId)

  return {
    periodStart,
    periodEnd,
    months,
    allMonthsLocked: months.every((m) => !m.hasTransactions || m.isLocked),
    anyOpenWithTransactions: months.some((m) => !m.isLocked && m.hasTransactions),
    lockedTransactionCount: lockedOnly.length,
    openTransactionCount: openOnly.length,
    totalInRange: inRange.length,
    openMonthIds,
  }
}

export function applyLodgmentScope<T extends { date: string }>(
  transactions: T[],
  periodStart: string,
  periodEnd: string,
  scope: LodgmentScopeMode,
  lockedPeriodIds: Set<string>,
  viewPeriodId: string | null
): T[] {
  let filtered = filterByDateRange(transactions, periodStart, periodEnd)

  if (scope === 'dashboard_month' && viewPeriodId) {
    return filterTransactionsForPeriod(filtered, viewPeriodId)
  }

  if (scope === 'locked_only') {
    return filtered.filter((tx) =>
      lockedPeriodIds.has(generatePeriodIdFromDateString(tx.date))
    )
  }

  return filtered
}

export function getOpeningBalanceForLodgmentScope(
  scope: LodgmentScopeMode,
  periodStart: string,
  viewPeriodId: string | null,
  financialPeriods: FinancialPeriod[],
  globalOpening: number,
  viewPeriodOpening: number
): number {
  if (scope === 'dashboard_month' && viewPeriodId) {
    const p = financialPeriods.find((x) => x.id === viewPeriodId)
    return p?.openingDirectorLoanBalance ?? viewPeriodOpening
  }

  const firstMonthId = generatePeriodIdFromDateString(periodStart)
  const firstPeriod = financialPeriods.find((x) => x.id === firstMonthId)
  return firstPeriod?.openingDirectorLoanBalance ?? globalOpening
}

export function isViewPeriodInsideRange(
  viewPeriodId: string | null,
  periodStart: string,
  periodEnd: string
): boolean {
  if (!viewPeriodId) return false
  const [year, month] = viewPeriodId.split('-').map(Number)
  const viewStart = new Date(year, month - 1, 1)
  const rangeStart = new Date(periodStart)
  const rangeEnd = new Date(periodEnd)
  rangeEnd.setHours(23, 59, 59, 999)
  return viewStart >= rangeStart && viewStart <= rangeEnd
}

/** Lock every unlocked month in a lodgment date range (oldest first). */
export async function lockMonthsInLodgmentRange(
  periodStart: string,
  periodEnd: string,
  allTransactions: Array<{ date: string; id?: string; description?: string }>,
  lockedPeriodIds: Set<string>,
  fallbackOpeningDirectorLoan = 0,
  fallbackOpeningCash = 0
): Promise<{ locked: string[]; failed: string[] }> {
  const monthIds = listMonthPeriodIdsInRange(periodStart, periodEnd)
  const locked: string[] = []
  const failed: string[] = []

  for (const periodId of monthIds) {
    if (lockedPeriodIds.has(periodId)) continue

    try {
      await preparePeriodForClose(
        periodId,
        allTransactions,
        fallbackOpeningDirectorLoan,
        fallbackOpeningCash
      )
      await closePeriodAndCarryForward(periodId, 'ato-lodgment-finalize')
      locked.push(periodId)
      lockedPeriodIds.add(periodId)
    } catch {
      failed.push(periodId)
    }
  }

  return { locked, failed }
}

export function scopeModeLabel(mode: LodgmentScopeMode): string {
  switch (mode) {
    case 'full':
      return 'Full reporting period'
    case 'locked_only':
      return 'Locked periods only'
    case 'dashboard_month':
      return 'Dashboard month'
  }
}
