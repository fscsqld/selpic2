import { describe, expect, it } from 'vitest'
import { generateBASReport } from '@/lib/payg-withholding/bas-reporter'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

describe('generateBASReport GST aligns with Biz Intel', () => {
  it('uses ÷11 metrics and ATO field shapes', () => {
    const txs = [
      {
        date: '2026-02-01',
        description: 'Sale',
        debit: null,
        credit: 1100,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      },
      {
        date: '2026-02-10',
        description: 'Fuel',
        debit: 110,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-02-15',
        description: 'Hanaone Express',
        debit: 252,
        credit: null,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        department: 'cleaning',
        source: 'bank',
        gstInfo: {
          isGSTIncluded: false,
          gstType: 'FREE' as const,
          gstAmount: 0,
        },
      },
    ]

    const report = generateBASReport(txs, '2026-01-01', '2026-03-31', 'quarterly', 'company')
    const metrics = calculateBusinessMetrics(txs, 0, 'company')

    expect(report.gstSummary?.g1TotalSales).toBeCloseTo(metrics.totalIncome, 2)
    expect(report.gstSummary?.label1A).toBeCloseTo(metrics.gstPayable, 2)
    expect(report.gstSummary?.label1B).toBeCloseTo(metrics.gstClaimable, 2)
    expect(report.gstSummary?.label1B).toBeCloseTo(110 / 11, 2)
    expect(report.gstSummary?.gstRefund).toBe(false)
  })

  it('auto-excludes untagged Hanaone from 1B (same as Summary export bug)', () => {
    const txs = [
      {
        date: '2026-03-25',
        description: 'Hanaone Express',
        debit: 252,
        credit: null,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-03-25',
        description: 'Crazydomains Website Ho',
        debit: 50.85,
        credit: null,
        category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-02-01',
        description: 'Travel case',
        debit: 152.1,
        credit: null,
        category: 'EXPENSE_OFFICE_SUPPLIES',
        department: 'cleaning',
        source: 'manual',
        gstInfo: {
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: 152.1 / 11,
          reasoning: 'Manual: AU GST claimable (BAS 1B)',
        },
      },
    ]

    const report = generateBASReport(txs, '2026-01-01', '2026-03-31', 'quarterly', 'company')
    // Hanaone excluded; CrazyDomains + travel case only → (50.85 + 152.10) / 11
    expect(report.gstSummary?.label1B).toBeCloseTo((50.85 + 152.1) / 11, 2)
    expect(report.gstSummary?.label1A).toBe(0)
    expect(report.gstSummary?.gstRefund).toBe(true)
  })
})
