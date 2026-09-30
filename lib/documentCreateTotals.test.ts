import { describe, expect, it } from 'vitest'
import { computeDocumentCreateTotals } from './documentCreateTotals'
import { getCleaningDefaultLineItems, getDefaultLineItemsByCategory } from './documentCreateDefaults'

describe('computeDocumentCreateTotals', () => {
  it('applies 10% promo then GST on reduced taxable (cleaning $10)', () => {
    const r = computeDocumentCreateTotals({
      items: [{ qty: 1, unitPrice: 10, taxRate: 0.1 }],
      promoDiscountPercent: 10,
    })
    expect(r.subtotal).toBe(10)
    expect(r.promoDiscount).toBe(1)
    expect(r.tax).toBe(0.9)
    expect(r.total).toBe(9.9)
  })

  it('does not charge GST on taxRate 0 shipping lines', () => {
    const r = computeDocumentCreateTotals({
      items: [
        { qty: 1, unitPrice: 100, taxRate: 0.1 },
        { qty: 1, unitPrice: 10, taxRate: 0 },
      ],
      promoDiscountPercent: 0,
    })
    expect(r.subtotal).toBe(110)
    expect(r.tax).toBe(10)
    expect(r.total).toBe(120)
  })

  it('scales GST when discount applies with mixed taxable + shipping', () => {
    const r = computeDocumentCreateTotals({
      items: [
        { qty: 1, unitPrice: 100, taxRate: 0.1 },
        { qty: 1, unitPrice: 10, taxRate: 0 },
      ],
      promoDiscountPercent: 10, // $11 off subtotal $110
    })
    expect(r.promoDiscount).toBe(11)
    // $11 discount hits taxable first → taxable 89, GST 8.9, shipping 10 → 107.9
    expect(r.tax).toBe(8.9)
    expect(r.total).toBe(107.9)
  })
})

describe('getCleaningDefaultLineItems', () => {
  it('seeds one cleaning line', () => {
    expect(getCleaningDefaultLineItems()).toHaveLength(1)
    expect(getDefaultLineItemsByCategory('cleaning')).toHaveLength(1)
  })
})

describe('getMarketSDefaultLineItems', () => {
  it('seeds Single Item line plus shipping', () => {
    const lines = getDefaultLineItemsByCategory('market-s')
    expect(lines.length).toBe(2)
    expect(lines[0]?.description).toMatch(/Single Item/i)
    expect(lines[1]?.description).toMatch(/Shipping/i)
  })
})
