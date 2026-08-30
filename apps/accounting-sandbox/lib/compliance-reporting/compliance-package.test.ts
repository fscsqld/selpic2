import { describe, expect, it } from 'vitest'
import { resolveComplianceReportPeriod } from './compliance-package'

describe('resolveComplianceReportPeriod', () => {
  const fy = { start: '2025-07-01', end: '2026-06-30' }

  it('keeps exact Q4 window (does not expand to full FY)', () => {
    const r = resolveComplianceReportPeriod({
      financialYear: fy,
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
    })
    expect(r.start).toBe('2026-04-01')
    expect(r.end).toBe('2026-06-30')
    expect(r.isExactBasQuarter).toBe(true)
    expect(r.label).toBe('Q4 2025-2026')
  })

  it('keeps exact Q1–Q3 windows', () => {
    expect(
      resolveComplianceReportPeriod({
        financialYear: fy,
        periodStart: '2025-07-01',
        periodEnd: '2025-09-30',
      }).label
    ).toBe('Q1 2025-2026')
    expect(
      resolveComplianceReportPeriod({
        financialYear: fy,
        periodStart: '2025-10-01',
        periodEnd: '2025-12-31',
      }).label
    ).toBe('Q2 2025-2026')
    expect(
      resolveComplianceReportPeriod({
        financialYear: fy,
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
      }).label
    ).toBe('Q3 2025-2026')
  })

  it('keeps full FY when banner selects FY dates', () => {
    const r = resolveComplianceReportPeriod({
      financialYear: fy,
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
    })
    expect(r.start).toBe('2025-07-01')
    expect(r.end).toBe('2026-06-30')
    expect(r.isExactBasQuarter).toBe(false)
  })

  it('falls back to financialYear when period omitted', () => {
    const r = resolveComplianceReportPeriod({ financialYear: fy })
    expect(r.start).toBe('2025-07-01')
    expect(r.end).toBe('2026-06-30')
  })
})
