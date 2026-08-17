import { describe, expect, it } from 'vitest'
import {
  auFyQuarterBounds,
  auFyQuarterParts,
  calendarDaysFromSydneyToday,
  currentAuFyQuarterPeriodId,
  formatAuFyPeriodId,
  getNextGrantTransferInfo,
  grantPayoutDueDate,
  parseFundraisingPeriod,
} from '@/lib/fundraising/auFinancialQuarter'

describe('auFinancialQuarter', () => {
  it('maps Jul–Sep to FY Q1', () => {
    const p = auFyQuarterParts(new Date('2025-08-15T12:00:00+10:00'))
    expect(p).toEqual({ fyStartYear: 2025, quarter: 1, fyLabel: '2025-26' })
    expect(formatAuFyPeriodId(2025, 1)).toBe('FY2025-26-Q1')
  })

  it('maps Oct–Dec to FY Q2', () => {
    const p = auFyQuarterParts(new Date('2025-11-02T12:00:00+11:00'))
    expect(p).toEqual({ fyStartYear: 2025, quarter: 2, fyLabel: '2025-26' })
  })

  it('maps Jan–Mar to FY Q3 of prior July start year', () => {
    const p = auFyQuarterParts(new Date('2026-02-10T12:00:00+11:00'))
    expect(p.fyStartYear).toBe(2025)
    expect(p.quarter).toBe(3)
  })

  it('maps Apr–Jun to FY Q4 of prior start year', () => {
    const p = auFyQuarterParts(new Date('2026-05-01T12:00:00+10:00'))
    expect(p.fyStartYear).toBe(2025)
    expect(p.quarter).toBe(4)
  })

  it('bounds match AU FY months for all four quarters', () => {
    const q1 = auFyQuarterBounds(2025, 1)
    expect(q1.startIso.startsWith('2025-07-01')).toBe(true)
    expect(q1.endIso.startsWith('2025-09-30')).toBe(true)

    const q2 = auFyQuarterBounds(2025, 2)
    expect(q2.startIso.startsWith('2025-10-01')).toBe(true)
    expect(q2.endIso.startsWith('2025-12-31')).toBe(true)

    const q3 = auFyQuarterBounds(2025, 3)
    expect(q3.startIso.startsWith('2026-01-01')).toBe(true)
    expect(q3.endIso.startsWith('2026-03-31')).toBe(true)

    const q4 = auFyQuarterBounds(2025, 4)
    expect(q4.startIso.startsWith('2026-04-01')).toBe(true)
    expect(q4.endIso.startsWith('2026-06-30')).toBe(true)
  })

  it('payout due is 15 Oct for Q1 (weekday)', () => {
    const due = grantPayoutDueDate(2025, 1)
    expect(due.toISOString().slice(0, 10)).toBe('2025-10-15')
  })

  it('parses FY period ids', () => {
    expect(parseFundraisingPeriod('FY2025-26-Q2')).toEqual({
      kind: 'au_fy_quarter',
      fyStartYear: 2025,
      quarter: 2,
    })
  })

  it('current period is FY-prefixed', () => {
    expect(currentAuFyQuarterPeriodId(new Date('2025-11-02'))).toBe('FY2025-26-Q2')
  })

  it('D-day uses calendar days not YYYYMMDD key math', () => {
    const now = new Date('2026-08-07T12:00:00+10:00')
    const payout = grantPayoutDueDate(2026, 1) // 15 Oct 2026
    const qEnd = new Date(auFyQuarterBounds(2026, 1).endIso)
    expect(calendarDaysFromSydneyToday(payout, now)).toBe(69)
    expect(calendarDaysFromSydneyToday(qEnd, now)).toBe(54)

    const info = getNextGrantTransferInfo(now)
    expect(info.periodId).toBe('FY2026-27-Q1')
    expect(info.daysUntilPayout).toBe(69)
    expect(info.daysUntilQuarterEnd).toBe(54)
  })
})
