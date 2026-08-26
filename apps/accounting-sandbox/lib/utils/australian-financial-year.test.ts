import { describe, expect, it } from 'vitest'
import {
  getAustralianQuarterDates,
  resolveReportingBasQuarter,
  resolveReportingFinancialYearRange,
} from '@/lib/utils/australian-financial-year'

describe('resolveReportingBasQuarter', () => {
  it('uses latest statement quarter when current calendar quarter is empty', () => {
    const q = resolveReportingBasQuarter(
      [
        { date: '2026-04-01' },
        { date: '2026-06-24' },
      ],
      new Date('2026-07-08T12:00:00')
    )
    expect(q.startDateStr).toBe('2026-04-01')
    expect(q.endDateStr).toBe('2026-06-30')
    expect(q.quarter).toBe(4)
    expect(q.financialYear).toBe('2025-2026')
  })

  it('accepts Australian DD/MM/YYYY dates without NaN', () => {
    const q = resolveReportingBasQuarter(
      [{ date: '24/06/2026' }, { date: '01/04/2026' }],
      new Date('2026-07-08T12:00:00')
    )
    expect(q.startDateStr).toBe('2026-04-01')
    expect(q.endDateStr).toBe('2026-06-30')
    expect(q.startDateStr.includes('NaN')).toBe(false)
  })

  it('keeps current quarter when it already has transactions', () => {
    const q = resolveReportingBasQuarter(
      [{ date: '2026-07-15' }],
      new Date('2026-07-08T12:00:00')
    )
    expect(q.startDateStr).toBe('2026-07-01')
    expect(q.endDateStr).toBe('2026-09-30')
  })
})

describe('resolveReportingFinancialYearRange', () => {
  it('maps Apr–Jun 2026 data to FY 2025-2026 (not 2026-2027)', () => {
    const fy = resolveReportingFinancialYearRange(
      [{ date: '2026-04-01' }, { date: '2026-06-24' }],
      new Date('2026-07-08T12:00:00')
    )
    expect(fy.financialYear).toBe('2025-2026')
    expect(fy.startDate).toBe('2025-07-01')
    expect(fy.endDate).toBe('2026-06-30')
  })
})

describe('getAustralianQuarterDates', () => {
  it('returns stable ISO strings for Q4', () => {
    const q = getAustralianQuarterDates(4, '2025-2026')
    expect(q.startDateStr).toBe('2026-04-01')
    expect(q.endDateStr).toBe('2026-06-30')
  })
})
