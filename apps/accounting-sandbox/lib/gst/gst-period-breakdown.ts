/**
 * Break GST 1A/1B estimates down by Australian BAS quarter inside a P&L window.
 * Explains why FY Claimable can exceed a single quarter (e.g. Q4) without summing
 * lodged BAS refunds (ATO $18 ≠ 1B).
 */

import {
  getAustralianQuarter,
  getAustralianQuarterDates,
} from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import {
  calculateBusinessMetrics,
  type Transaction,
} from '@/lib/utils/business-calculations'
import { filterTransactionsForDateRange } from '@/lib/dashboard/view-period-range'

export type GstQuarterSlice = {
  financialYear: string
  quarter: 1 | 2 | 3 | 4
  label: string
  startDate: string
  endDate: string
  gstPayable: number
  gstClaimable: number
  transactionCount: number
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function quarterKey(fy: string, q: number): string {
  return `${fy}-q${q}`
}

/**
 * Quarters that intersect the given transactions (by date), with metrics for
 * rows that fall in each quarter. Empty quarters omitted.
 */
export function breakdownGstByBasQuarter(
  transactions: Transaction[],
  accountType: 'individual' | 'company' | 'sole_trader' = 'company',
  gstRegistered: boolean = true
): GstQuarterSlice[] {
  if (!gstRegistered || accountType === 'individual' || transactions.length === 0) {
    return []
  }

  const buckets = new Map<string, { fy: string; quarter: 1 | 2 | 3 | 4 }>()

  for (const tx of transactions) {
    const iso = toIsoDateString(tx.date)
    if (!iso) continue
    const { quarter, financialYear } = getAustralianQuarter(
      new Date(`${iso}T12:00:00`)
    )
    const key = quarterKey(financialYear, quarter)
    if (!buckets.has(key)) {
      buckets.set(key, { fy: financialYear, quarter: quarter as 1 | 2 | 3 | 4 })
    }
  }

  const slices: GstQuarterSlice[] = []
  for (const { fy, quarter } of buckets.values()) {
    const q = getAustralianQuarterDates(quarter as 1 | 2 | 3 | 4, fy)
    const inQuarter = filterTransactionsForDateRange(
      transactions,
      q.startDateStr,
      q.endDateStr
    )
    if (inQuarter.length === 0) continue
    const metrics = calculateBusinessMetrics(
      inQuarter,
      0,
      accountType,
      0,
      gstRegistered
    )
    if (metrics.gstPayable < 0.005 && metrics.gstClaimable < 0.005) continue
    slices.push({
      financialYear: fy,
      quarter: quarter as 1 | 2 | 3 | 4,
      label: `Q${quarter} ${fy}`,
      startDate: q.startDateStr,
      endDate: q.endDateStr,
      gstPayable: roundMoney(metrics.gstPayable),
      gstClaimable: roundMoney(metrics.gstClaimable),
      transactionCount: inQuarter.length,
    })
  }

  return slices.sort((a, b) => {
    if (a.financialYear !== b.financialYear) {
      return a.financialYear.localeCompare(b.financialYear)
    }
    return a.quarter - b.quarter
  })
}

/** Sum of per-quarter claimable — must match period gstClaimable when quarters partition the window. */
export function sumQuarterGstClaimable(slices: GstQuarterSlice[]): number {
  return roundMoney(slices.reduce((s, x) => s + x.gstClaimable, 0))
}
