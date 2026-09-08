/**
 * S3 — quarter window + cron gates (pure).
 */

import { describe, expect, it } from 'vitest'
import {
  getSiteReviewQuarterWindow,
  hasQuarterlyReportForPeriod,
  isSiteReviewCronEmailEnabled,
  isSiteReviewCronEnabled,
} from './quarterlyCron'

describe('getSiteReviewQuarterWindow', () => {
  it('is in window on Sydney Jul 1 (Q1 start)', () => {
    // 2025-06-30 14:00 UTC = 2025-07-01 00:00 Sydney (AEST, UTC+10)
    const w = getSiteReviewQuarterWindow(new Date('2025-06-30T14:00:00.000Z'))
    expect(w.inWindow).toBe(true)
    expect(w.sydneyDate).toBe('2025-07-01')
    expect(w.periodKey).toBe('FY2025-26-Q1')
  })

  it('is in window on day 2 of quarter start month', () => {
    const w = getSiteReviewQuarterWindow(new Date('2025-07-01T14:00:00.000Z'))
    expect(w.sydneyDate).toBe('2025-07-02')
    expect(w.inWindow).toBe(true)
  })

  it('is outside window mid-quarter', () => {
    const w = getSiteReviewQuarterWindow(new Date('2025-08-15T02:00:00.000Z'))
    expect(w.inWindow).toBe(false)
    expect(w.periodKey).toBe('FY2025-26-Q1')
  })
})

describe('hasQuarterlyReportForPeriod', () => {
  it('detects existing quarterly report', () => {
    expect(
      hasQuarterlyReportForPeriod(
        [
          { periodKey: 'FY2025-26-Q1', trigger: 'manual' },
          { periodKey: 'FY2025-26-Q1', trigger: 'quarterly' },
        ],
        'FY2025-26-Q1'
      )
    ).toBe(true)
  })

  it('ignores manual-only reports', () => {
    expect(
      hasQuarterlyReportForPeriod(
        [{ periodKey: 'FY2025-26-Q1', trigger: 'manual' }],
        'FY2025-26-Q1'
      )
    ).toBe(false)
  })
})

describe('cron kill switches', () => {
  it('defaults cron enabled', () => {
    expect(isSiteReviewCronEnabled({})).toBe(true)
    expect(isSiteReviewCronEnabled({ SITE_REVIEW_CRON_ENABLED: '0' })).toBe(false)
  })

  it('defaults email enabled', () => {
    expect(isSiteReviewCronEmailEnabled({})).toBe(true)
    expect(isSiteReviewCronEmailEnabled({ SITE_REVIEW_CRON_EMAIL: 'off' })).toBe(false)
  })
})
