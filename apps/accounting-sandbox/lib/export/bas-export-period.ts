/**
 * Decide whether Export BAS can run immediately or needs a period picker.
 * BAS = one GST reporting period (quarter or month), never a silent FY collapse.
 */

import type { DashboardViewPeriod } from '@/lib/dashboard/view-period-range'
import { financialYearToViewPeriod } from '@/lib/dashboard/view-period-range'
import {
  getAllQuartersForFinancialYear,
  getAustralianFinancialYear,
  getAustralianQuarter,
  getAustralianQuarterDates,
  isValidAustralianFinancialYear,
} from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type GstReportingCycle = 'Monthly' | 'Quarterly'

export type BasExportPeriodOption = {
  id: string
  label: string
  startDate: string
  endDate: string
  periodType: 'monthly' | 'quarterly'
  /** Short slug for filenames e.g. Q3-2025-2026 */
  fileSlug: string
}

export type BasExportPeriodDecision =
  | {
      kind: 'ready'
      option: BasExportPeriodOption
      /** True when option dates equal the P&L banner window */
      matchesPlBanner: boolean
    }
  | {
      kind: 'need_picker'
      reason: 'fy' | 'multi_period'
      title: string
      options: BasExportPeriodOption[]
    }
  | { kind: 'error'; message: string }

function iso(d: string): string {
  return toIsoDateString(d) || String(d || '').slice(0, 10)
}

function monthLabel(startDate: string): string {
  const d = new Date(`${startDate}T12:00:00`)
  return d.toLocaleString('en-AU', { month: 'long', year: 'numeric' })
}

function quarterOption(q: 1 | 2 | 3 | 4, financialYear: string): BasExportPeriodOption {
  const dates = getAustralianQuarterDates(q, financialYear)
  const months =
    q === 1 ? 'Jul–Sep' : q === 2 ? 'Oct–Dec' : q === 3 ? 'Jan–Mar' : 'Apr–Jun'
  return {
    id: `${financialYear}-Q${q}`,
    label: `Q${q} ${financialYear} (${months})`,
    startDate: dates.startDateStr,
    endDate: dates.endDateStr,
    periodType: 'quarterly',
    fileSlug: `Q${q}-${financialYear}`,
  }
}

function monthOption(year: number, monthIndex0: number): BasExportPeriodOption {
  const start = new Date(year, monthIndex0, 1)
  const end = new Date(year, monthIndex0 + 1, 0)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const startDate = fmt(start)
  const endDate = fmt(end)
  const yyyyMm = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`
  return {
    id: `M-${yyyyMm}`,
    label: monthLabel(startDate),
    startDate,
    endDate,
    periodType: 'monthly',
    fileSlug: `M-${yyyyMm}`,
  }
}

function resolveFinancialYearLabel(viewPeriod: DashboardViewPeriod): string | null {
  if (
    viewPeriod.financialYear &&
    isValidAustralianFinancialYear(viewPeriod.financialYear)
  ) {
    return viewPeriod.financialYear
  }
  const start = iso(viewPeriod.startDate)
  if (!start) return null
  return getAustralianFinancialYear(new Date(`${start}T12:00:00`))
}

function isFullFinancialYear(viewPeriod: DashboardViewPeriod): boolean {
  if (viewPeriod.preset === 'financial_year') return true
  const fy = resolveFinancialYearLabel(viewPeriod)
  if (!fy) return false
  const full = financialYearToViewPeriod(fy)
  return (
    iso(viewPeriod.startDate) === iso(full.startDate) &&
    iso(viewPeriod.endDate) === iso(full.endDate)
  )
}

function listOverlappingQuarters(
  startDate: string,
  endDate: string
): BasExportPeriodOption[] {
  const s = iso(startDate)
  const e = iso(endDate)
  if (!s || !e || s > e) return []
  const fys = new Set<string>()
  fys.add(getAustralianFinancialYear(new Date(`${s}T12:00:00`)))
  fys.add(getAustralianFinancialYear(new Date(`${e}T12:00:00`)))
  const out: BasExportPeriodOption[] = []
  const seen = new Set<string>()
  for (const fy of fys) {
    for (const q of getAllQuartersForFinancialYear(fy)) {
      if (q.endDateStr < s || q.startDateStr > e) continue
      const opt = quarterOption(q.quarter, fy)
      if (seen.has(opt.id)) continue
      seen.add(opt.id)
      out.push(opt)
    }
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function listOverlappingMonths(
  startDate: string,
  endDate: string
): BasExportPeriodOption[] {
  const s = iso(startDate)
  const e = iso(endDate)
  if (!s || !e || s > e) return []
  const out: BasExportPeriodOption[] = []
  let y = Number(s.slice(0, 4))
  let m = Number(s.slice(5, 7)) - 1
  const endY = Number(e.slice(0, 4))
  const endM = Number(e.slice(5, 7)) - 1
  while (y < endY || (y === endY && m <= endM)) {
    out.push(monthOption(y, m))
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
    if (out.length > 24) break
  }
  return out
}

/**
 * Resolve Export BAS period from the P&L banner + GST reporting cycle.
 */
export function resolveBasExportPeriodDecision(
  viewPeriod: Pick<
    DashboardViewPeriod,
    'preset' | 'startDate' | 'endDate' | 'financialYear'
  >,
  gstReportingCycle: GstReportingCycle = 'Quarterly'
): BasExportPeriodDecision {
  const start = iso(viewPeriod.startDate)
  const end = iso(viewPeriod.endDate)
  if (!start || !end) {
    return {
      kind: 'error',
      message: 'Select a P&L period before exporting BAS.',
    }
  }

  const quarterly = gstReportingCycle !== 'Monthly'

  if (quarterly) {
    if (isFullFinancialYear(viewPeriod as DashboardViewPeriod)) {
      const fy = resolveFinancialYearLabel(viewPeriod as DashboardViewPeriod)
      if (!fy) {
        return { kind: 'error', message: 'Could not resolve financial year for BAS.' }
      }
      return {
        kind: 'need_picker',
        reason: 'fy',
        title: `Which BAS quarter for FY ${fy}?`,
        options: [1, 2, 3, 4].map((q) =>
          quarterOption(q as 1 | 2 | 3 | 4, fy)
        ),
      }
    }

    const overlapping = listOverlappingQuarters(start, end)
    if (overlapping.length === 0) {
      return { kind: 'error', message: 'No BAS quarter overlaps the selected P&L period.' }
    }

    const exact = overlapping.find((o) => o.startDate === start && o.endDate === end)
    if (exact) {
      return { kind: 'ready', option: exact, matchesPlBanner: true }
    }

    if (overlapping.length === 1) {
      return {
        kind: 'ready',
        option: overlapping[0],
        matchesPlBanner: false,
      }
    }

    return {
      kind: 'need_picker',
      reason: 'multi_period',
      title: 'Which BAS quarter do you want to export?',
      options: overlapping,
    }
  }

  // Monthly cycle
  const months = listOverlappingMonths(start, end)
  if (months.length === 0) {
    return { kind: 'error', message: 'No month overlaps the selected P&L period.' }
  }
  const exactMonth = months.find((o) => o.startDate === start && o.endDate === end)
  if (exactMonth) {
    return { kind: 'ready', option: exactMonth, matchesPlBanner: true }
  }
  if (months.length === 1) {
    return {
      kind: 'ready',
      option: months[0],
      matchesPlBanner: months[0].startDate === start && months[0].endDate === end,
    }
  }
  return {
    kind: 'need_picker',
    reason: isFullFinancialYear(viewPeriod as DashboardViewPeriod) ? 'fy' : 'multi_period',
    title: isFullFinancialYear(viewPeriod as DashboardViewPeriod)
      ? 'Which BAS month do you want to export?'
      : 'Which BAS month do you want to export?',
    options: months,
  }
}

/** Infer AU quarter label from a ready option (tests / toasts). */
export function describeBasExportOption(option: BasExportPeriodOption): string {
  return option.label
}

/** @internal test helper */
export function _quarterFromStart(startDate: string): { quarter: 1 | 2 | 3 | 4; financialYear: string } {
  return getAustralianQuarter(new Date(`${iso(startDate)}T12:00:00`))
}
