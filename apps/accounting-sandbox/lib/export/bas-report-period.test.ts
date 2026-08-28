import { describe, expect, it } from 'vitest'
import { resolveBasReportPeriod } from '@/lib/export/bas-report-period'

describe('resolveBasReportPeriod', () => {
  it('keeps exact BAS quarter dates and label', () => {
    const p = resolveBasReportPeriod('2026-01-01', '2026-03-31', 'quarterly')
    expect(p.type).toBe('quarterly')
    expect(p.isExactBasQuarter).toBe(true)
    expect(p.label).toBe('Q3 2025-2026')
    expect(p.startDate).toBe('2026-01-01')
    expect(p.endDate).toBe('2026-03-31')
  })

  it('does not snap FY banner to Q1 — custom range instead', () => {
    const p = resolveBasReportPeriod('2025-07-01', '2026-06-30', 'quarterly')
    expect(p.type).toBe('custom')
    expect(p.isExactBasQuarter).toBe(false)
    expect(p.label).toBe('FY 2025-2026')
    expect(p.startDate).toBe('2025-07-01')
    expect(p.endDate).toBe('2026-06-30')
  })

  it('resolves exact calendar month', () => {
    const p = resolveBasReportPeriod('2026-02-01', '2026-02-28', 'monthly')
    expect(p.type).toBe('monthly')
    expect(p.isExactBasMonth).toBe(true)
    expect(p.label).toContain('2026')
  })
})
