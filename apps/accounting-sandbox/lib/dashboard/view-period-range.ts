/**
 * Dashboard P&L view period — user-defined date ranges for GST quarters and FY reporting.
 */

import {
  getAustralianFinancialYear,
  getAustralianQuarter,
  getAustralianQuarterDates,
  getCurrentAustralianQuarter,
  getCurrentMonthDates,
  type AustralianQuarter,
} from '@/lib/utils/australian-financial-year'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import { generatePeriodIdFromDateString } from '@/lib/period-management/period-lock'
import { getPeriodDates } from '@/lib/period-management/period-utils'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type DashboardPeriodPreset =
  | 'custom'
  | 'month'
  | 'statement'
  | 'bas_q1'
  | 'bas_q2'
  | 'bas_q3'
  | 'bas_q4'
  | 'financial_year'

export interface DashboardViewPeriod {
  preset: DashboardPeriodPreset
  startDate: string
  endDate: string
  /** YYYY-MM when preset === 'month' */
  monthPeriodId?: string
  /** e.g. 2025-2026 for BAS / FY presets */
  financialYear?: string
}

export const DASHBOARD_VIEW_PERIOD_KEY = 'selpic_dashboard_view_period'

/** ISO dates only — repairs OCR years (267→2026) before compare/sort. */
function collectIsoDates(transactions: Array<{ date: string }>): string[] {
  return transactions
    .map((tx) => toIsoDateString(tx.date))
    .filter((d): d is string => !!d)
    .sort()
}

export function filterTransactionsForDateRange<T extends { date: string }>(
  transactions: T[],
  startDate: string,
  endDate: string
): T[] {
  const startIso = toIsoDateString(startDate) || startDate
  const endIso = toIsoDateString(endDate) || endDate
  return transactions.filter((tx) => {
    const d = toIsoDateString(tx.date)
    if (!d) return false
    return d >= startIso && d <= endIso
  })
}

/** Add Cash Expense rows — never in bank statement PDF snapshots. */
export function isManualCashExpenseTx(tx: {
  source?: string
  id?: string
}): boolean {
  if (tx.source === 'manual') return true
  return String(tx.id || '').startsWith('cash_')
}

/**
 * Merge manual cash expenses from the full ledger into bank/statement rows.
 * Dedupes by id. Optional date window matches Biz Intel P&L period behaviour.
 */
export function mergeManualCashExpenses<T extends { date: string; id?: string; source?: string }>(
  bankRows: T[],
  fullLedger: T[],
  startDate?: string,
  endDate?: string
): T[] {
  const manual = fullLedger.filter(isManualCashExpenseTx)
  const cashRows =
    startDate && endDate
      ? filterTransactionsForDateRange(manual, startDate, endDate)
      : manual
  if (cashRows.length === 0) return bankRows

  const seen = new Set(bankRows.map((tx) => String(tx.id || '')))
  const merged = [...bankRows]
  for (const cash of cashRows) {
    const id = String(cash.id || '')
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    merged.push(cash)
  }
  return merged.sort((a, b) =>
    String(a.date || '').localeCompare(String(b.date || ''))
  )
}

export function viewPeriodMatchesRange(
  viewPeriod: Pick<DashboardViewPeriod, 'startDate' | 'endDate'>,
  startDate: string,
  endDate: string
): boolean {
  const s = toIsoDateString(viewPeriod.startDate) || viewPeriod.startDate
  const e = toIsoDateString(viewPeriod.endDate) || viewPeriod.endDate
  const rs = toIsoDateString(startDate) || startDate
  const re = toIsoDateString(endDate) || endDate
  return s === rs && e === re
}

export function monthPeriodIdToRange(periodId: string): DashboardViewPeriod {
  const [year, month] = periodId.split('-').map(Number)
  const { startDate, endDate } = getPeriodDates(year, month)
  const pad = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return {
    preset: 'month',
    startDate: pad(startDate),
    endDate: pad(endDate),
    monthPeriodId: periodId,
    financialYear: getAustralianFinancialYear(startDate),
  }
}

export function basQuarterToViewPeriod(
  quarter: 1 | 2 | 3 | 4,
  financialYear: string
): DashboardViewPeriod {
  const q = getAustralianQuarterDates(quarter, financialYear)
  return {
    preset: `bas_q${quarter}` as DashboardPeriodPreset,
    startDate: q.startDateStr,
    endDate: q.endDateStr,
    financialYear,
  }
}

export function financialYearToViewPeriod(financialYear?: string): DashboardViewPeriod {
  const fy = financialYear ?? getCurrentFinancialYearRange().financialYear
  const [startYear] = fy.split('-').map(Number)
  return {
    preset: 'financial_year',
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`,
    financialYear: fy,
  }
}

export function getTransactionDateBounds(
  transactions: Array<{ date: string }>
): { startDate: string; endDate: string } | null {
  const dates = collectIsoDates(transactions)
  if (!dates.length) return null
  return { startDate: dates[0], endDate: dates[dates.length - 1] }
}

export function statementRangeFromTransactions(
  transactions: Array<{ date: string }>
): DashboardViewPeriod | null {
  const bounds = getTransactionDateBounds(transactions)
  if (!bounds) return null
  return {
    preset: 'statement',
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    financialYear: getAustralianFinancialYear(new Date(`${bounds.startDate}T12:00:00`)),
  }
}

/** Pick BAS quarter that holds the majority of rows (ignores OCR/prior-year outliers). */
function dominantBasQuarter(
  isoDates: string[]
): { quarter: AustralianQuarter; financialYear: string; count: number } | null {
  if (!isoDates.length) return null
  const counts = new Map<
    string,
    { quarter: AustralianQuarter; financialYear: string; count: number }
  >()
  for (const iso of isoDates) {
    const { quarter, financialYear } = getAustralianQuarter(new Date(`${iso}T12:00:00`))
    const key = `${financialYear}-q${quarter}`
    const prev = counts.get(key)
    if (prev) prev.count += 1
    else counts.set(key, { quarter, financialYear, count: 1 })
  }
  let best: { quarter: AustralianQuarter; financialYear: string; count: number } | null =
    null
  for (const row of counts.values()) {
    if (!best || row.count > best.count) best = row
  }
  return best
}

/** Normalise OCR years in a stored/custom view period (e.g. end 267-04-08 → 2026-04-08). */
export function healViewPeriodDates(period: DashboardViewPeriod): DashboardViewPeriod {
  const startDate = toIsoDateString(period.startDate) || period.startDate
  const endDate = toIsoDateString(period.endDate) || period.endDate
  if (startDate === period.startDate && endDate === period.endDate) return period
  return { ...period, startDate, endDate }
}

/** Best default after multi-month upload — prefer full BAS quarter if txs cluster there. */
export function inferViewPeriodFromTransactions(
  transactions: Array<{ date: string }>
): DashboardViewPeriod {
  const isoDates = collectIsoDates(transactions)
  if (!isoDates.length) {
    const month = getCurrentMonthDates()
    return {
      preset: 'month',
      startDate: month.startDateStr,
      endDate: month.endDateStr,
      monthPeriodId: generatePeriodIdFromDateString(month.startDateStr),
      financialYear: getAustralianFinancialYear(month.startDate),
    }
  }

  // Majority quarter wins (e.g. Apr–Jun BAS with one 2025 outlier + OCR 267 date)
  const dominant = dominantBasQuarter(isoDates)
  if (dominant && dominant.count >= 3 && dominant.count / isoDates.length >= 0.5) {
    return basQuarterToViewPeriod(dominant.quarter, dominant.financialYear)
  }

  const statement = statementRangeFromTransactions(transactions)
  if (!statement) {
    const month = getCurrentMonthDates()
    return {
      preset: 'month',
      startDate: month.startDateStr,
      endDate: month.endDateStr,
      monthPeriodId: generatePeriodIdFromDateString(month.startDateStr),
      financialYear: getAustralianFinancialYear(month.startDate),
    }
  }

  const midIso = isoDates[Math.floor(isoDates.length / 2)]
  const { quarter, financialYear } = getAustralianQuarter(new Date(`${midIso}T12:00:00`))
  const q = getAustralianQuarterDates(quarter, financialYear)

  if (statement.startDate >= q.startDateStr && statement.endDate <= q.endDateStr) {
    return basQuarterToViewPeriod(quarter, financialYear)
  }

  return statement
}

export function getDefaultViewPeriod(): DashboardViewPeriod {
  const currentQ = getCurrentAustralianQuarter()
  return basQuarterToViewPeriod(currentQ.quarter, currentQ.financialYear)
}

export function formatViewPeriodLabel(period: DashboardViewPeriod): string {
  const healed = healViewPeriodDates(period)
  const fmt = (iso: string) => {
    const normalised = toIsoDateString(iso) || iso
    return new Date(`${normalised}T12:00:00`).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  const fmtMonthYear = (iso: string) => {
    const normalised = toIsoDateString(iso) || iso
    return new Date(`${normalised}T12:00:00`).toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric',
    })
  }
  const formatFyShort = (fy?: string) => {
    if (!fy) return ''
    const [a, b] = fy.split('-')
    if (a && b?.length === 4) return `${a}–${b.slice(2)}`
    return fy
  }

  switch (healed.preset) {
    case 'month':
      if (healed.monthPeriodId) {
        const [y, m] = healed.monthPeriodId.split('-').map(Number)
        return new Date(y, m - 1, 1).toLocaleDateString('en-AU', {
          month: 'long',
          year: 'numeric',
        })
      }
      return fmtMonthYear(healed.startDate)
    case 'bas_q1':
      return `Q1 Jul–Sep ${healed.startDate.slice(0, 4)}`
    case 'bas_q2':
      return `Q2 Oct–Dec ${healed.startDate.slice(0, 4)}`
    case 'bas_q3':
      return `Q3 Jan–Mar ${healed.endDate.slice(0, 4)}`
    case 'bas_q4':
      return `Q4 Apr–Jun ${healed.endDate.slice(0, 4)}`
    case 'financial_year':
      return `FY ${formatFyShort(healed.financialYear)}`.trim()
    case 'statement':
      return `${fmt(healed.startDate)} – ${fmt(healed.endDate)}`
    case 'custom':
      return `${fmt(healed.startDate)} – ${fmt(healed.endDate)}`
  }

  return `${fmt(healed.startDate)} – ${fmt(healed.endDate)}`
}

export function listBasQuarterOptions(
  transactions: Array<{ date: string }>,
  reference: Date = new Date()
): Array<{ key: string; label: string; period: DashboardViewPeriod; txCount: number }> {
  const fySet = new Set<string>()
  for (const tx of transactions) {
    const iso = toIsoDateString(tx.date)
    if (iso) fySet.add(getAustralianFinancialYear(new Date(`${iso}T12:00:00`)))
  }
  // Only fall back to calendar FY when there is no ledger data yet
  if (fySet.size === 0) {
    fySet.add(getAustralianFinancialYear(reference))
  }

  const options: Array<{
    key: string
    label: string
    period: DashboardViewPeriod
    txCount: number
  }> = []

  for (const fy of [...fySet].sort()) {
    for (const q of [1, 2, 3, 4] as const) {
      const period = basQuarterToViewPeriod(q, fy)
      const txCount = filterTransactionsForDateRange(
        transactions,
        period.startDate,
        period.endDate
      ).length
      const base = formatViewPeriodLabel(period)
      options.push({
        key: `${fy}-q${q}`,
        label: txCount > 0 ? `${base} · ${txCount} txs` : base,
        period,
        txCount,
      })
    }
  }

  return options.sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
}

export function getViewPeriodFromStorage(): DashboardViewPeriod | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DASHBOARD_VIEW_PERIOD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DashboardViewPeriod
    if (parsed?.startDate && parsed?.endDate && parsed?.preset) {
      return healViewPeriodDates(parsed)
    }
  } catch {
    /* ignore */
  }
  return null
}

export function setViewPeriodInStorage(period: DashboardViewPeriod): void {
  if (typeof window === 'undefined') return
  const healed = healViewPeriodDates(period)
  localStorage.setItem(DASHBOARD_VIEW_PERIOD_KEY, JSON.stringify(healed))
  window.dispatchEvent(
    new CustomEvent('dashboardViewPeriodChanged', { detail: { period: healed } })
  )
}

/** Migrate legacy single-month viewPeriodId from localStorage */
export function migrateLegacyViewPeriodId(legacyPeriodId: string | null): DashboardViewPeriod | null {
  if (!legacyPeriodId || !/^\d{4}-\d{2}$/.test(legacyPeriodId)) return null
  return monthPeriodIdToRange(legacyPeriodId)
}

export function firstMonthPeriodId(period: DashboardViewPeriod): string {
  const healed = healViewPeriodDates(period)
  return healed.monthPeriodId ?? generatePeriodIdFromDateString(healed.startDate)
}
