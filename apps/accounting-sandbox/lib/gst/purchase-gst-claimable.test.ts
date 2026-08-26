import { describe, expect, it } from 'vitest'
import { analyzeGstSalesBreakdown } from '@/lib/ato-lodgment/gst-breakdown'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'

describe('purchase GST claimable vs P&L', () => {
  it('treats untagged manual cash expenses as GST-free for 1B', () => {
    expect(
      isPurchaseGstClaimable({
        debit: 1516.08,
        category: 'EXPENSE_TRAVEL_TRANSPORT',
        department: 'cleaning',
        source: 'manual',
      })
    ).toBe(false)
  })

  it('keeps full expenses in P&L but only claimable amount in 1B', () => {
    const txs = [
      {
        date: '2026-01-19',
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
        },
      },
      {
        date: '2026-01-09',
        description: 'ASIC',
        debit: 611,
        credit: null,
        category: 'EXPENSE_STARTUP_INCORPORATION',
        department: 'cleaning',
        source: 'manual',
        // no gstInfo → manual default free
      },
      {
        date: '2025-12-07',
        description: 'Korea flight',
        debit: 1516.08,
        credit: null,
        category: 'EXPENSE_TRAVEL_TRANSPORT',
        department: 'cleaning',
        source: 'manual',
        gstInfo: {
          isGSTIncluded: false,
          gstType: 'FREE' as const,
          gstAmount: 0,
        },
      },
    ]

    const metrics = calculateBusinessMetrics(txs, 0, 'company')
    expect(metrics.totalExpenses).toBeCloseTo(152.1 + 611 + 1516.08, 2)
    expect(metrics.taxableExpenses).toBeCloseTo(152.1, 2)
    expect(metrics.gstClaimable).toBeCloseTo(152.1 / 11, 2)

    const gst = analyzeGstSalesBreakdown(txs)
    expect(gst.gstOnPurchases).toBeCloseTo(metrics.gstClaimable, 2)
  })

  it('still claims GST on untagged bank expenses', () => {
    const txs = [
      {
        date: '2026-02-01',
        description: 'Liberty',
        debit: 84.04,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
        source: 'bank',
      },
    ]
    const metrics = calculateBusinessMetrics(txs, 0, 'company')
    expect(metrics.gstClaimable).toBeCloseTo(84.04 / 11, 2)
  })
})
