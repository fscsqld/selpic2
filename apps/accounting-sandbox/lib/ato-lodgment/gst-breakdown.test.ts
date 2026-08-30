import { describe, expect, it } from 'vitest'
import { analyzeGstSalesBreakdown } from '@/lib/ato-lodgment/gst-breakdown'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

describe('analyzeGstSalesBreakdown', () => {
  it('excludes ATO GST refund from G1 and G3', () => {
    const txs = [
      {
        date: '2026-05-07',
        description: 'Associated Cleaning',
        debit: null,
        credit: 3526.6,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      },
      {
        date: '2026-05-12',
        description: 'Ato79694194011i002 Ato Selpic',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'cleaning',
      },
    ]
    const result = analyzeGstSalesBreakdown(txs)
    expect(result.g1TotalSalesGstInclusive).toBe(3526.6)
    expect(result.g3OtherGstFreeSales).toBe(0)
  })

  it('excludes director reimbursements and erroneous payments from 1B', () => {
    const txs = [
      {
        date: '2026-04-09',
        description: 'Liberty',
        debit: 84.04,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
      },
      {
        date: '2026-06-24',
        description: 'Jinsoo Kim V7533652037',
        debit: 129.6,
        credit: null,
        category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        department: 'cleaning',
      },
      {
        date: '2026-06-24',
        description: 'Jinsoo Kim Z3533358260',
        debit: 50.85,
        credit: null,
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
        department: 'cleaning',
      },
    ]
    const result = analyzeGstSalesBreakdown(txs)
    expect(result.gstOnPurchases).toBeCloseTo(84.04 / 11, 2)
  })

  it('aligns G1 and 1A/1B with Biz Intel calculateBusinessMetrics', () => {
    const txs = [
      {
        date: '2026-04-07',
        description: 'Associated Cleaning',
        debit: null,
        credit: 3526.6,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      },
      {
        date: '2026-04-09',
        description: 'Liberty',
        debit: 84.04,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
      },
      {
        date: '2026-05-12',
        description: 'ATO refund',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'cleaning',
      },
      {
        date: '2026-06-24',
        description: 'Jinsoo Kim Return',
        debit: null,
        credit: 50.85,
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
        department: 'cleaning',
      },
    ]
    const metrics = calculateBusinessMetrics(txs, 0, 'company')
    const gst = analyzeGstSalesBreakdown(txs)
    expect(gst.g1TotalSalesGstInclusive).toBeCloseTo(metrics.totalIncome, 2)
    expect(gst.gstOnSales).toBeCloseTo(metrics.gstPayable, 2)
    expect(gst.gstOnPurchases).toBeCloseTo(metrics.gstClaimable, 2)
  })
})
