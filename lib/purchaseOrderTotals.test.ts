import { describe, expect, it } from 'vitest'
import { computePurchaseOrderTotals, lineAmount } from './purchaseOrderTotals'
import type { PurchaseOrderLine } from './purchaseOrderTypes'

const line = (qty: number, unitPrice: number): PurchaseOrderLine => ({
  lineNo: 1,
  descriptionEn: 'Mask',
  packUnit: 'carton',
  qty,
  unitPrice,
})

describe('purchaseOrderTotals', () => {
  it('computes overseas zero-rated with freight', () => {
    const r = computePurchaseOrderTotals({
      items: [line(10, 1000)],
      charges: { freight: 500, insurance: 0, other: 0 },
      taxRule: 'overseas_zero',
      currency: 'KRW',
    })
    expect(r.subtotal).toBe(10000)
    expect(r.tax).toBe(0)
    expect(r.total).toBe(10500)
    expect(r.currency).toBe('KRW')
  })

  it('computes AU GST excluded on goods only', () => {
    const r = computePurchaseOrderTotals({
      items: [line(2, 50)],
      charges: { freight: 10 },
      taxRule: 'au_gst_excluded',
      currency: 'AUD',
    })
    expect(r.subtotal).toBe(100)
    expect(r.tax).toBe(10)
    expect(r.total).toBe(120)
  })

  it('lineAmount multiplies qty × unit price', () => {
    expect(lineAmount(line(4, 12.5))).toBe(50)
  })
})
