/**
 * Resolve BAS Excel/report period labels — only snap to a BAS quarter when
 * start/end exactly match that quarter. FY / custom spans keep caller dates.
 */

import { matchExactBasQuarter } from '@/lib/dashboard/view-period-range'
import { getAustralianFinancialYear } from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

export type BasReportPeriodType = 'monthly' | 'quarterly' | 'custom'

export interface BasReportPeriod {
  startDate: string
  endDate: string
  label: string
  type: BasReportPeriodType
  /** Excel / UI type row */
  typeLabel: string
  isExactBasQuarter: boolean
  isExactBasMonth: boolean
}

function iso(d: string): string {
  return toIsoDateString(d) || String(d || '').slice(0, 10)
}

function isFullFinancialYear(start: string, end: string): boolean {
  const fy = getAustralianFinancialYear(new Date(`${end}T12:00:00`))
  const fyStart = `${Number(fy.split('-')[0])}-07-01`
  const fyEnd = `${Number(fy.split('-')[0]) + 1}-06-30`
  return start === fyStart && end === fyEnd
}

function customRangeLabel(start: string, end: string): string {
  if (isFullFinancialYear(start, end)) {
    const y = Number(start.slice(0, 4))
    return `FY ${y}-${y + 1}`
  }
  return `${start} → ${end}`
}

function isExactCalendarMonth(start: string, end: string): boolean {
  const s = new Date(`${start}T12:00:00`)
  const e = new Date(`${end}T12:00:00`)
  if (s.getFullYear() !== e.getFullYear() || s.getMonth() !== e.getMonth()) return false
  if (s.getDate() !== 1) return false
  const lastDay = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate()
  return e.getDate() === lastDay
}

function monthLabelFromStart(start: string): string {
  const d = new Date(`${start}T12:00:00`)
  return d.toLocaleString('en-AU', { month: 'long', year: 'numeric' })
}

export function resolveBasReportPeriod(
  startDate: string,
  endDate: string,
  requestedType: 'monthly' | 'quarterly'
): BasReportPeriod {
  const start = iso(startDate)
  const end = iso(endDate)

  if (requestedType === 'quarterly') {
    const exact = matchExactBasQuarter(start, end)
    if (exact) {
      return {
        startDate: exact.startDateStr,
        endDate: exact.endDateStr,
        label: `Q${exact.quarter} ${exact.financialYear}`,
        type: 'quarterly',
        typeLabel: 'Quarterly (one BAS GST period)',
        isExactBasQuarter: true,
        isExactBasMonth: false,
      }
    }
    return {
      startDate: start,
      endDate: end,
      label: customRangeLabel(start, end),
      type: 'custom',
      typeLabel: 'Custom / multi-period (not one BAS quarter)',
      isExactBasQuarter: false,
      isExactBasMonth: false,
    }
  }

  if (isExactCalendarMonth(start, end)) {
    return {
      startDate: start,
      endDate: end,
      label: monthLabelFromStart(start),
      type: 'monthly',
      typeLabel: 'Monthly (one BAS GST period)',
      isExactBasQuarter: false,
      isExactBasMonth: true,
    }
  }

  return {
    startDate: start,
    endDate: end,
    label: customRangeLabel(start, end),
    type: 'custom',
    typeLabel: 'Custom / multi-period (not one BAS month)',
    isExactBasQuarter: false,
    isExactBasMonth: false,
  }
}
