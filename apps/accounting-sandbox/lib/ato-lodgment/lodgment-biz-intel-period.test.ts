import { describe, expect, it } from 'vitest'
import { computeBasLodgment } from '@/lib/ato-lodgment/compute-lodgment'
import {
  financialYearToViewPeriod,
  basQuarterToViewPeriod,
  resolveAlignedReportingWindow,
  resolveBasLodgmentQuarterForFiling,
  filterBusinessLedgerForPeriod,
} from '@/lib/dashboard/view-period-range'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

const sampleTxs = [
  {
    date: '2025-08-10',
    description: 'Q1 sale',
    debit: null as number | null,
    credit: 1100,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'bank',
  },
  {
    date: '2026-02-10',
    description: 'Q3 sale',
    debit: null as number | null,
    credit: 2200,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'bank',
  },
  {
    date: '2026-05-10',
    description: 'Q4 sale',
    debit: null as number | null,
    credit: 3300,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'bank',
  },
  {
    date: '2026-05-15',
    description: 'Q4 fuel',
    debit: 110,
    credit: null as number | null,
    category: 'EXPENSE_FUEL_TRAVEL',
    department: 'cleaning',
    source: 'bank',
  },
]

describe('ATO Lodgment BAS filing period (not Biz Intel FY sum)', () => {
  it('Q4 banner → lodgment fields match Biz Intel Q4 only', () => {
    const view = basQuarterToViewPeriod(4, '2025-2026')
    const filing = resolveBasLodgmentQuarterForFiling(view, sampleTxs)
    expect(filing.source).toBe('exact_banner')
    expect(filing.quarter.quarter).toBe(4)
    expect(filing.quarter.startDateStr).toBe('2026-04-01')
    expect(filing.quarter.endDateStr).toBe('2026-06-30')

    const bizIntelRows = filterBusinessLedgerForPeriod(
      sampleTxs,
      filing.quarter.startDateStr,
      filing.quarter.endDateStr
    )
    const metrics = calculateBusinessMetrics(bizIntelRows, 0, 'company')
    const bas = computeBasLodgment(
      sampleTxs,
      filing.quarter.startDateStr,
      filing.quarter.endDateStr,
      'quarterly',
      `Q4 ${filing.quarter.financialYear}`,
      0,
      'company',
      0,
      true
    )

    expect(bas.fields.find((f) => f.id === 'G1')?.amount).toBeCloseTo(metrics.totalIncome, 2)
    expect(bas.fields.find((f) => f.id === 'G1')?.amount).toBeCloseTo(3300, 2)
  })

  it('Financial Year banner → ATO defaults to Q4 (end of FY), not FY 1B sum', () => {
    const view = financialYearToViewPeriod('2025-2026')
    const pl = resolveAlignedReportingWindow(view, sampleTxs)
    expect(pl.startDate).toBe('2025-07-01')
    expect(pl.endDate).toBe('2026-06-30')

    const filing = resolveBasLodgmentQuarterForFiling(view, sampleTxs)
    expect(filing.source).toBe('banner_end')
    expect(filing.quarter.quarter).toBe(4)
    expect(filing.quarter.startDateStr).toBe('2026-04-01')
    expect(filing.quarter.endDateStr).toBe('2026-06-30')

    const fyMetrics = calculateBusinessMetrics(
      filterBusinessLedgerForPeriod(sampleTxs, pl.startDate, pl.endDate),
      0,
      'company'
    )
    const q4Metrics = calculateBusinessMetrics(
      filterBusinessLedgerForPeriod(
        sampleTxs,
        filing.quarter.startDateStr,
        filing.quarter.endDateStr
      ),
      0,
      'company'
    )
    // FY income includes Q1+Q3+Q4; lodging quarter must be Q4-only
    expect(fyMetrics.totalIncome).toBeCloseTo(1100 + 2200 + 3300, 2)
    expect(q4Metrics.totalIncome).toBeCloseTo(3300, 2)
    expect(q4Metrics.totalIncome).toBeLessThan(fyMetrics.totalIncome)

    const bas = computeBasLodgment(
      sampleTxs,
      filing.quarter.startDateStr,
      filing.quarter.endDateStr,
      'quarterly',
      'Q4 2025-2026',
      0,
      'company',
      0,
      true
    )
    expect(bas.fields.find((f) => f.id === 'G1')?.amount).toBeCloseTo(3300, 2)
    expect(bas.periodStart).toBe('2026-04-01')
    expect(bas.periodEnd).toBe('2026-06-30')
  })
})
