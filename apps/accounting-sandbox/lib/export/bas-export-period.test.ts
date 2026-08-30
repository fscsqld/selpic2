import { describe, expect, it } from 'vitest'
import { resolveBasExportPeriodDecision } from '@/lib/export/bas-export-period'

describe('resolveBasExportPeriodDecision', () => {
  it('asks which quarter when P&L is full FY (quarterly cycle)', () => {
    const d = resolveBasExportPeriodDecision(
      {
        preset: 'financial_year',
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        financialYear: '2025-2026',
      },
      'Quarterly'
    )
    expect(d.kind).toBe('need_picker')
    if (d.kind !== 'need_picker') return
    expect(d.reason).toBe('fy')
    expect(d.options).toHaveLength(4)
    expect(d.options[0].id).toBe('2025-2026-Q1')
    expect(d.options[2].startDate).toBe('2026-01-01')
    expect(d.options[2].endDate).toBe('2026-03-31')
  })

  it('exports immediately when banner is exactly one BAS quarter', () => {
    const d = resolveBasExportPeriodDecision(
      {
        preset: 'bas_q3',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        financialYear: '2025-2026',
      },
      'Quarterly'
    )
    expect(d.kind).toBe('ready')
    if (d.kind !== 'ready') return
    expect(d.matchesPlBanner).toBe(true)
    expect(d.option.fileSlug).toBe('Q3-2025-2026')
  })

  it('asks which quarter when custom span covers multiple quarters', () => {
    const d = resolveBasExportPeriodDecision(
      {
        preset: 'custom',
        startDate: '2025-12-01',
        endDate: '2026-03-31',
      },
      'Quarterly'
    )
    expect(d.kind).toBe('need_picker')
    if (d.kind !== 'need_picker') return
    expect(d.options.map((o) => o.id)).toEqual(['2025-2026-Q2', '2025-2026-Q3'])
  })

  it('monthly cycle: asks months across FY', () => {
    const d = resolveBasExportPeriodDecision(
      {
        preset: 'financial_year',
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        financialYear: '2025-2026',
      },
      'Monthly'
    )
    expect(d.kind).toBe('need_picker')
    if (d.kind !== 'need_picker') return
    expect(d.options.length).toBe(12)
  })

  it('monthly cycle: ready for a single calendar month', () => {
    const d = resolveBasExportPeriodDecision(
      {
        preset: 'month',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      },
      'Monthly'
    )
    expect(d.kind).toBe('ready')
    if (d.kind !== 'ready') return
    expect(d.option.periodType).toBe('monthly')
    expect(d.matchesPlBanner).toBe(true)
  })
})
