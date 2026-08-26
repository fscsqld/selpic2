import { describe, expect, it } from 'vitest'
import {
  breakdownGstByBasQuarter,
  sumQuarterGstClaimable,
} from '@/lib/gst/gst-period-breakdown'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'

describe('FY GST Claimable vs quarters', () => {
  it('ATO GST refund credit does not inflate gstClaimable', () => {
    const txs = [
      {
        date: '2026-02-15',
        description: 'Ato79694194011i002 Ato Selpic',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'general',
        source: 'bank',
      },
      {
        date: '2026-05-10',
        description: 'Subcontractor',
        debit: 5999.18,
        credit: null,
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
        source: 'bank',
      },
    ] as any

    const fy = calculateBusinessMetrics(txs, 0, 'company', 0, true)
    expect(fy.gstClaimable).toBeCloseTo(5999.18 / 11, 2)
    expect(fy.gstClaimable).toBeCloseTo(545.38, 2)
  })

  it('EXPENSE_ATO_GST_BAS debit is not claimable for 1B', () => {
    expect(
      isPurchaseGstClaimable({
        debit: 18,
        category: 'EXPENSE_ATO_GST_BAS',
        source: 'bank',
      })
    ).toBe(false)
  })

  it('FY claimable equals sum of quarter claimables (Q3 partial + Q4)', () => {
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
        date: '2026-02-01',
        description: 'Hosting',
        debit: 50.85,
        credit: null,
        category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-05-10',
        description: 'Subcontractor',
        debit: 5999.18,
        credit: null,
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-02-20',
        description: 'Ato refund',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'general',
        source: 'bank',
      },
    ] as any

    const fy = calculateBusinessMetrics(txs, 0, 'company', 0, true)
    // 152.1 + 50.85 = 202.95 → 18.45; + 545.38 = 563.83
    expect(fy.gstClaimable).toBeCloseTo(563.83, 2)

    const slices = breakdownGstByBasQuarter(txs, 'company', true)
    expect(sumQuarterGstClaimable(slices)).toBeCloseTo(fy.gstClaimable, 2)

    const q3 = slices.find((s) => s.quarter === 3)
    const q4 = slices.find((s) => s.quarter === 4)
    expect(q3?.gstClaimable).toBeCloseTo(18.45, 2)
    expect(q4?.gstClaimable).toBeCloseTo(545.38, 2)
  })
})
