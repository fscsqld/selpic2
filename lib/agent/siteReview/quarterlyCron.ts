/**
 * AU FY quarter-boundary window for Site Review cron (Sydney calendar).
 * Runs on day 1–2 of Jul / Oct / Jan / Apr — Hobby-safe daily cron gates here.
 */

import { auFyQuarterParts, sydneyCalendarDateKey } from '../../fundraising/auFinancialQuarter'
import { siteReviewPeriodKey } from './periodKey'

const QUARTER_START_MONTHS = new Set([1, 4, 7, 10])

export type SiteReviewQuarterWindow = {
  inWindow: boolean
  periodKey: string
  sydneyDate: string
  month: number
  day: number
}

/**
 * True on the first two Sydney calendar days of each AU FY quarter.
 * Cousins: UTC vs Sydney midnight, leap years, Hobby cron only once/day at 22:00 UTC.
 */
export function getSiteReviewQuarterWindow(d = new Date()): SiteReviewQuarterWindow {
  const key = sydneyCalendarDateKey(d)
  const [y, m, day] = key.split('-').map(Number)
  const inWindow = QUARTER_START_MONTHS.has(m) && day >= 1 && day <= 2
  return {
    inWindow,
    periodKey: siteReviewPeriodKey(d),
    sydneyDate: key,
    month: m,
    day: day || 0,
  }
}

export function isSiteReviewCronEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(env.SITE_REVIEW_CRON_ENABLED || '1').trim().toLowerCase()
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no')
}

export function isSiteReviewCronEmailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(env.SITE_REVIEW_CRON_EMAIL || '1').trim().toLowerCase()
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no')
}

/** Already ran a quarterly report for this periodKey. */
export function hasQuarterlyReportForPeriod(
  reports: Array<{ periodKey: string; trigger: string }>,
  periodKey: string
): boolean {
  return reports.some(
    (r) => r.periodKey === periodKey && String(r.trigger).toLowerCase() === 'quarterly'
  )
}

export function describeAuFyQuarterStart(d = new Date()): string {
  const { fyLabel, quarter } = auFyQuarterParts(d)
  return `FY${fyLabel}-Q${quarter}`
}
