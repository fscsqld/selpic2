/**
 * Resolve Reports / ATO financial year and BAS quarter from real data,
 * not from calendar "today" when statements are for a prior quarter.
 *
 * Prefer the FY / quarter that contains the most bank transactions.
 * Dashboard month (viewPeriodId) is the explicit user context and must win
 * over a single newer-dated row (e.g. today's journal) when data is empty
 * or clustered elsewhere.
 */

import {
  getAustralianFinancialYear,
  getAustralianQuarter,
  getAustralianQuarterDates,
  isValidAustralianFinancialYear,
  type AustralianQuarter,
} from '@/lib/utils/australian-financial-year'
import {
  periodIdToIsoDate,
  parseTransactionDate,
  toIsoDateString,
} from '@/lib/utils/parse-transaction-date'

export interface ReportingPeriodResolveInput {
  transactions: Array<{ date?: unknown }>
  /** Dashboard selected month, e.g. 2026-04 */
  viewPeriodId?: string | null
  /** Period ids known to contain data, newest last preferred */
  knownPeriodIds?: string[]
  asOf?: Date
}

function financialYearRangeFromIso(iso: string): {
  financialYear: string
  startDate: string
  endDate: string
} {
  const parsed = parseTransactionDate(iso) ?? new Date()
  const fy = getAustralianFinancialYear(parsed)
  const safeFy = isValidAustralianFinancialYear(fy) ? fy : getAustralianFinancialYear(new Date())
  const [startYear, endYear] = safeFy.split('-').map(Number)
  return {
    financialYear: safeFy,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  }
}

function financialYearRangeFromLabel(fy: string): {
  financialYear: string
  startDate: string
  endDate: string
} {
  const safeFy = isValidAustralianFinancialYear(fy) ? fy.trim() : getAustralianFinancialYear(new Date())
  const [startYear, endYear] = safeFy.split('-').map(Number)
  return {
    financialYear: safeFy,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  }
}

/** Count parseable transaction dates per Australian financial year. */
export function countTransactionsByFinancialYear(
  transactions: Array<{ date?: unknown }>
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tx of transactions) {
    const parsed = parseTransactionDate(tx.date)
    if (!parsed) continue
    const fy = getAustralianFinancialYear(parsed)
    if (!isValidAustralianFinancialYear(fy)) continue
    counts.set(fy, (counts.get(fy) || 0) + 1)
  }
  return counts
}

/** FY label with the most transactions (ties → lexicographically later FY). */
export function dominantFinancialYear(
  transactions: Array<{ date?: unknown }>
): string | null {
  const counts = countTransactionsByFinancialYear(transactions)
  let best: string | null = null
  let bestCount = 0
  for (const [fy, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && fy > best)) {
      best = fy
      bestCount = count
    }
  }
  return bestCount > 0 ? best : null
}

/**
 * Pick the best ISO date that represents "what statements we have".
 * Priority:
 * 1. Dominant FY from transaction cluster (not a single newest outlier)
 * 2. Dashboard viewPeriodId
 * 3. Known period ids before calendar "this month"
 * 4. asOf (today)
 */
export function resolveReportingAnchorIso(input: ReportingPeriodResolveInput): string {
  const asOf = input.asOf ?? new Date()

  const dominantFy = dominantFinancialYear(input.transactions)
  if (dominantFy) {
    // Use end of that FY as anchor for BAS default (overridden separately)
    const range = financialYearRangeFromLabel(dominantFy)
    // Prefer latest tx *within* that dominant FY
    let latestInFy: string | null = null
    for (const tx of input.transactions) {
      const iso = toIsoDateString(tx.date)
      const parsed = parseTransactionDate(tx.date)
      if (!iso || !parsed) continue
      if (getAustralianFinancialYear(parsed) !== dominantFy) continue
      if (!latestInFy || iso > latestInFy) latestInFy = iso
    }
    if (latestInFy) return latestInFy
    return range.endDate
  }

  const fromView = periodIdToIsoDate(input.viewPeriodId ?? null)
  if (fromView) return fromView

  const asOfPeriodId = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`
  const periods = [...(input.knownPeriodIds || [])]
    .filter((id) => /^\d{4}-\d{2}$/.test(id) && id < asOfPeriodId)
    .sort()
  if (periods.length > 0) {
    const last = periodIdToIsoDate(periods[periods.length - 1])
    if (last) return last
  }

  return toIsoDateString(asOf) || asOf.toISOString().slice(0, 10)
}

export function resolveReportingFinancialYearRange(
  input: ReportingPeriodResolveInput
): { financialYear: string; startDate: string; endDate: string } {
  // 1) FY with the most transactions always wins
  const dominantFy = dominantFinancialYear(input.transactions)
  if (dominantFy) {
    return financialYearRangeFromLabel(dominantFy)
  }

  // 2) Explicit dashboard month (user intent) — even if tx list is empty / not yet hydrated
  const fromView = periodIdToIsoDate(input.viewPeriodId ?? null)
  if (fromView) {
    return financialYearRangeFromIso(fromView)
  }

  // 3) Fall back to anchor chain
  return financialYearRangeFromIso(resolveReportingAnchorIso(input))
}

export function resolveReportingBasQuarter(
  input: ReportingPeriodResolveInput
): AustralianQuarter {
  const asOf = input.asOf ?? new Date()
  const current = (() => {
    const { quarter, financialYear } = getAustralianQuarter(asOf)
    return getAustralianQuarterDates(quarter, financialYear)
  })()

  // Count txs per BAS quarter (within their FY)
  const quarterCounts = new Map<string, { count: number; sample: AustralianQuarter }>()
  for (const tx of input.transactions) {
    const parsed = parseTransactionDate(tx.date)
    if (!parsed) continue
    try {
      const { quarter, financialYear } = getAustralianQuarter(parsed)
      const q = getAustralianQuarterDates(quarter, financialYear)
      const key = `${financialYear}-Q${quarter}`
      const prev = quarterCounts.get(key)
      quarterCounts.set(key, {
        count: (prev?.count || 0) + 1,
        sample: q,
      })
    } catch {
      /* skip */
    }
  }

  let best: AustralianQuarter | null = null
  let bestCount = 0
  for (const { count, sample } of quarterCounts.values()) {
    if (count > bestCount) {
      best = sample
      bestCount = count
    }
  }
  if (best && bestCount > 0) return best

  // No txs in any quarter — use dashboard month, then current calendar quarter
  const fromView = periodIdToIsoDate(input.viewPeriodId ?? null)
  if (fromView) {
    try {
      const { quarter, financialYear } = getAustralianQuarter(new Date(`${fromView}T12:00:00`))
      return getAustralianQuarterDates(quarter, financialYear)
    } catch {
      /* fall through */
    }
  }

  const anchor = resolveReportingAnchorIso(input)
  try {
    const { quarter, financialYear } = getAustralianQuarter(new Date(`${anchor}T12:00:00`))
    return getAustralianQuarterDates(quarter, financialYear)
  } catch {
    return current
  }
}
