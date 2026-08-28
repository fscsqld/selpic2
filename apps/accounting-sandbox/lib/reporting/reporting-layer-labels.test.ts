import { describe, expect, it } from 'vitest'
import { buildExportSummaryRows } from '@/lib/reporting/reporting-layer-labels'

describe('buildExportSummaryRows', () => {
  it('includes L1 and L2 rows when GST splits income/expenses', () => {
    const rows = buildExportSummaryRows({
      totalIncome: 14419.48,
      totalExpenses: 15346.61,
      netProfit: -927.13,
      totalIncomeExGst: 13108.62,
      totalExpensesExGst: 14783,
      netProfitExGst: -1674.38,
      totalGSTPayable: 1310.86,
      totalGSTClaimable: 563.61,
      directorsLoanBalance: 0,
      periodLabel: '2025-07-01_to_2026-06-30',
      rowCount: 42,
    })

    const metrics = rows.map((r) => r.Metric)
    expect(metrics).toContain('Total Income (L1)')
    expect(metrics).toContain('Total Income (L2)')
    expect(rows.find((r) => r.Metric === 'Total Income (L1)')?.Amount).toBe('14419.48')
    expect(rows.find((r) => r.Metric === 'Total Income (L2)')?.Amount).toBe('13108.62')
  })

  it('omits L2 section when cash equals ex-GST', () => {
    const rows = buildExportSummaryRows({
      totalIncome: 100,
      totalExpenses: 50,
      netProfit: 50,
      totalIncomeExGst: 100,
      totalExpensesExGst: 50,
      netProfitExGst: 50,
      totalGSTPayable: 0,
      totalGSTClaimable: 0,
      directorsLoanBalance: 0,
    })
    expect(rows.some((r) => r.Metric.includes('L2 Tax basis'))).toBe(false)
  })
})
