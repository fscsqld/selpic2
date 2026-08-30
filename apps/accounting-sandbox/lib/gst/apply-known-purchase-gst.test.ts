import { describe, expect, it } from 'vitest'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { detectSelpicCompanyRule } from '@/lib/classification/selpic-company-rules'

describe('known purchase GST tags (statement rows)', () => {
  it('classifies Crazy Domains as software expense', () => {
    const match = detectSelpicCompanyRule('Crazydomains Website Ho', 50.85, null)
    expect(match?.category).toBe('EXPENSE_SOFTWARE_SUBSCRIPTIONS')
  })

  it('claims GST on Crazy Domains and excludes Hanaone from 1B', () => {
    const tagged = applyKnownPurchaseGstTags([
      {
        date: '2026-03-25',
        description: 'Crazydomains Website Ho',
        debit: 50.85,
        credit: null,
        category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
        department: 'cleaning',
        source: 'bank',
        gstInfo: {
          isGSTIncluded: false,
          gstType: 'FREE' as const,
          gstAmount: 0,
          reasoning: 'stale wrong tag',
        },
      },
      {
        date: '2026-03-25',
        description: 'Hanaone Express',
        debit: 252,
        credit: null,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        department: 'cleaning',
        source: 'bank',
        gstInfo: {
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: 252 / 11,
          reasoning: 'old force freight GST',
        },
      },
    ])

    expect(tagged[0].gstInfo?.gstType).toBe('INCLUDED')
    expect(tagged[1].gstInfo?.gstType).toBe('FREE')

    const metrics = calculateBusinessMetrics(tagged, 0, 'company')
    expect(metrics.totalExpenses).toBeCloseTo(50.85 + 252, 2)
    expect(metrics.taxableExpenses).toBeCloseTo(50.85, 2)
    expect(metrics.gstClaimable).toBeCloseTo(50.85 / 11, 2)
  })

  it('does not overwrite Manual GST overrides', () => {
    const tagged = applyKnownPurchaseGstTags([
      {
        description: 'Hanaone Express',
        debit: 252,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        department: 'cleaning',
        gstInfo: {
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: 252 / 11,
          reasoning: 'Manual: AU GST claimable (BAS 1B)',
        },
      },
    ])
    expect(tagged[0].gstInfo?.gstType).toBe('INCLUDED')
  })
})
