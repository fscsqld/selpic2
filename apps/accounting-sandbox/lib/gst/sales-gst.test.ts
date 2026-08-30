import { describe, expect, it } from 'vitest'
import {
  buildGstInfoForSale,
  gstAmountOnSale,
  sumGstPayableOnSales,
} from '@/lib/gst/sales-gst'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

describe('sales GST (1A)', () => {
  it('untagged income defaults to inclusive ÷11 when GST-registered', () => {
    const sale = {
      date: '2026-05-01',
      description: 'Customer payment',
      debit: null,
      credit: 1100,
      category: 'INCOME_SERVICES',
      department: 'business',
    }
    expect(gstAmountOnSale(sale)).toBe(100)
    expect(sumGstPayableOnSales([sale], true)).toBe(100)
    const m = calculateBusinessMetrics([sale] as any, 0, 'company', 0, true)
    expect(m.gstPayable).toBe(100)
  })

  it('Manual GST-free sale contributes 0 to 1A', () => {
    const sale = {
      date: '2026-05-01',
      description: 'GST-free supply',
      debit: null,
      credit: 1100,
      category: 'INCOME_SERVICES',
      department: 'business',
      gstInfo: buildGstInfoForSale(1100, false),
    }
    expect(sale.gstInfo.reasoning.startsWith('Manual:')).toBe(true)
    expect(gstAmountOnSale(sale)).toBe(0)
    const m = calculateBusinessMetrics([sale] as any, 0, 'company', 0, true)
    expect(m.gstPayable).toBe(0)
  })

  it('not GST-registered → 1A and 1B are 0 even with taxable income/expense', () => {
    const txs = [
      {
        date: '2026-05-01',
        description: 'Sale',
        debit: null,
        credit: 1100,
        category: 'INCOME_SERVICES',
        department: 'business',
      },
      {
        date: '2026-05-02',
        description: 'Supplier',
        debit: 220,
        credit: null,
        category: 'EXPENSE_SUPPLIES',
        department: 'business',
      },
    ]
    const m = calculateBusinessMetrics(txs as any, 0, 'company', 0, false)
    expect(m.totalIncome).toBe(1100)
    expect(m.gstPayable).toBe(0)
    expect(m.gstClaimable).toBe(0)
  })

  it('mixed: one FREE sale + one inclusive sale', () => {
    const txs = [
      {
        date: '2026-05-01',
        description: 'Free',
        debit: null,
        credit: 500,
        category: 'INCOME_SERVICES',
        department: 'business',
        gstInfo: buildGstInfoForSale(500, false),
      },
      {
        date: '2026-05-02',
        description: 'Taxable',
        debit: null,
        credit: 1100,
        category: 'INCOME_SERVICES',
        department: 'business',
        gstInfo: buildGstInfoForSale(1100, true),
      },
    ]
    expect(sumGstPayableOnSales(txs, true)).toBe(100)
  })
})
