import { describe, expect, it } from 'vitest'
import {
  dominantFinancialYear,
  resolveReportingBasQuarter,
  resolveReportingFinancialYearRange,
} from '@/lib/utils/reporting-period-resolve'

const asOf = new Date('2026-07-08T12:00:00')

describe('resolveReportingPeriod (data-driven)', () => {
  it('uses Apr–Jun cluster for FY 2025-2026 even if one tx is dated today (Jul)', () => {
    const fy = resolveReportingFinancialYearRange({
      transactions: [
        { date: '2026-04-01' },
        { date: '2026-05-15' },
        { date: '2026-06-24' },
        { date: '2026-06-29' },
        { date: '2026-07-08' }, // outlier / journal today
      ],
      viewPeriodId: '2026-04',
      asOf,
    })
    expect(dominantFinancialYear([
      { date: '2026-04-01' },
      { date: '2026-06-24' },
      { date: '2026-07-08' },
    ])).toBe('2025-2026')
    expect(fy.financialYear).toBe('2025-2026')
    expect(fy.startDate).toBe('2025-07-01')
    expect(fy.endDate).toBe('2026-06-30')
  })

  it('falls back to dashboard viewPeriodId 2026-04 when txs empty', () => {
    const fy = resolveReportingFinancialYearRange({
      transactions: [],
      viewPeriodId: '2026-04',
      asOf,
    })
    expect(fy.financialYear).toBe('2025-2026')
  })

  it('does NOT use calendar FY 2026-2027 when dashboard is April and txs empty', () => {
    const fy = resolveReportingFinancialYearRange({
      transactions: [],
      viewPeriodId: '2026-04',
      knownPeriodIds: ['2026-07', '2026-08', '2026-04'],
      asOf,
    })
    expect(fy.financialYear).toBe('2025-2026')
    expect(fy.startDate).toBe('2025-07-01')
  })

  it('BAS uses Q4 Apr–Jun when most data is there', () => {
    const q = resolveReportingBasQuarter({
      transactions: [
        { date: '24/06/2026' },
        { date: '01/04/2026' },
        { date: '15/05/2026' },
        { date: '08/07/2026' },
      ],
      viewPeriodId: '2026-04',
      asOf,
    })
    expect(q.quarter).toBe(4)
    expect(q.startDateStr).toBe('2026-04-01')
    expect(q.endDateStr).toBe('2026-06-30')
  })

  it('BAS keeps data quarter when stale dashboard month is empty Q1', () => {
    // Regression: viewPeriodId 2025-07 forced empty Jul–Sep BAS while statements are Apr–Jun
    const q = resolveReportingBasQuarter({
      transactions: [
        { date: '2026-04-07' },
        { date: '2026-05-12' },
        { date: '2026-06-05' },
        { date: '2026-06-24' },
      ],
      viewPeriodId: '2025-07',
      asOf,
    })
    expect(q.quarter).toBe(4)
    expect(q.startDateStr).toBe('2026-04-01')
    expect(q.endDateStr).toBe('2026-06-30')
  })

  it('BAS uses viewPeriodId when txs empty but dashboard is April', () => {
    const q = resolveReportingBasQuarter({
      transactions: [],
      viewPeriodId: '2026-04',
      asOf,
    })
    expect(q.quarter).toBe(4)
    expect(q.startDateStr).toBe('2026-04-01')
  })
})
