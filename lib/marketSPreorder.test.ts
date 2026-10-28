import { describe, expect, it } from 'vitest'
import {
  assertMarketSCatalogAllowsPurchase,
  applyPreorderSoldIncrements,
  buildMarketSSalesModePayload,
  buildOrderItemPreorderSnapshot,
  collectPreorderSoldIncrements,
  formatOrderItemPreorderNote,
  formatPreorderShipsFromLabel,
  getMarketSPreorderCountdownParts,
  getMarketSPreorderPurchaseLimit,
  isMarketSPreorderOpen,
  isMarketSPreorderProduct,
  normalizeMarketSSalesMode,
  orderHasPreorderItems,
  orderIncludesPreorder,
  shouldShowMarketSPreorderCountdown,
} from './marketSPreorder'

const openPreorder = {
  category: 'HotGoods' as const,
  salesMode: 'preorder' as const,
  preorderSupplierConfirmed: true,
  preorderShipsFrom: '2026-10-20',
  preorderClosesAt: '2099-01-01T00:00:00.000Z',
  stockQuantity: 0,
  inStock: false,
}

describe('normalizeMarketSSalesMode', () => {
  it('defaults missing / unknown to in_stock (live catalog safe)', () => {
    expect(normalizeMarketSSalesMode(undefined)).toBe('in_stock')
    expect(normalizeMarketSSalesMode('')).toBe('in_stock')
    expect(normalizeMarketSSalesMode('PREORDER')).toBe('in_stock')
  })
})

describe('isMarketSPreorderOpen', () => {
  it('is false for normal HotGoods without salesMode', () => {
    expect(isMarketSPreorderOpen({ category: 'HotGoods' })).toBe(false)
    expect(isMarketSPreorderProduct({ category: 'HotGoods', salesMode: 'in_stock' })).toBe(false)
  })

  it('requires HotGoods, supplier confirmed, ships from, and open window', () => {
    expect(isMarketSPreorderOpen(openPreorder)).toBe(true)
    expect(
      isMarketSPreorderOpen({ ...openPreorder, preorderSupplierConfirmed: false })
    ).toBe(false)
    expect(isMarketSPreorderOpen({ ...openPreorder, preorderShipsFrom: '' })).toBe(false)
    expect(
      isMarketSPreorderOpen({
        ...openPreorder,
        preorderClosesAt: '2020-01-01T00:00:00.000Z',
      })
    ).toBe(false)
  })

  it('never opens for Stickers even if fields are set', () => {
    expect(
      isMarketSPreorderOpen({
        category: 'Stickers',
        salesMode: 'preorder',
        preorderSupplierConfirmed: true,
        preorderShipsFrom: '2026-10-20',
      })
    ).toBe(false)
  })

  it('returns purchase limit instead of stock when open', () => {
    expect(getMarketSPreorderPurchaseLimit(openPreorder)).toBe(99)
    expect(
      getMarketSPreorderPurchaseLimit({
        ...openPreorder,
        preorderMaxQty: 5,
        preorderSoldCount: 2,
      })
    ).toBe(3)
    expect(getMarketSPreorderPurchaseLimit({ category: 'HotGoods', stockQuantity: 0 })).toBe(null)
  })
})

describe('buildMarketSSalesModePayload', () => {
  it('rejects preorder without supplier confirmation', () => {
    const r = buildMarketSSalesModePayload({
      category: 'HotGoods',
      salesMode: 'preorder',
      preorderSupplierConfirmed: false,
      preorderShipsFrom: '2026-10-20',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/supplier/i)
  })

  it('rejects countdown without closes at', () => {
    const r = buildMarketSSalesModePayload({
      category: 'HotGoods',
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderShipsFrom: '2026-10-20',
      preorderCountdownEnabled: true,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Closes at/i)
  })

  it('accepts confirmed preorder with ships from', () => {
    const r = buildMarketSSalesModePayload({
      category: 'HotGoods',
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderShipsFrom: '2026-10-20',
      preorderNote: 'Limited first shipment',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.salesMode).toBe('preorder')
      expect(r.payload.preorderSupplierConfirmed).toBe(true)
      expect(r.payload.preorderShipsFrom).toBe('2026-10-20')
      expect(r.payload.preorderCountdownEnabled).toBe(false)
    }
  })

  it('accepts countdown when Closes at is in the future', () => {
    const closes = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const r = buildMarketSSalesModePayload({
      category: 'HotGoods',
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderShipsFrom: '2026-12-01',
      preorderClosesAt: closes,
      preorderCountdownEnabled: true,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.preorderCountdownEnabled).toBe(true)
      expect(r.payload.preorderClosesAt).toBe(closes)
    }
  })

  it('clears preorder fields for non-HotGoods', () => {
    const r = buildMarketSSalesModePayload({
      category: 'Stickers',
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderShipsFrom: '2026-10-20',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.payload.salesMode).toBeUndefined()
  })
})

describe('preorder sold increments', () => {
  it('collects only frozen preorder lines by productId', () => {
    expect(
      collectPreorderSoldIncrements([
        { productId: 'a', quantity: 2, salesModeAtOrder: 'preorder' },
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 1, salesModeAtOrder: 'preorder' },
      ])
    ).toEqual({ a: 3 })
  })

  it('applies sold increments onto matching catalog rows', () => {
    const { products, changed, applied } = applyPreorderSoldIncrements(
      [
        { id: 'a', preorderSoldCount: 2 },
        { id: 'b', preorderSoldCount: 0 },
      ],
      { a: 3 }
    )
    expect(changed).toBe(true)
    expect(applied).toEqual({ a: 3 })
    expect(products[0].preorderSoldCount).toBe(5)
    expect(products[1].preorderSoldCount).toBe(0)
  })
})

describe('formatPreorderShipsFromLabel', () => {
  it('formats YYYY-MM-DD for en-AU customers', () => {
    expect(formatPreorderShipsFromLabel('2026-10-20')).toBe('Ships from 20 Oct 2026')
  })
})

describe('formatOrderItemPreorderNote / orderIncludesPreorder', () => {
  it('formats frozen preorder line notes and detects order flag', () => {
    expect(
      formatOrderItemPreorderNote({
        salesModeAtOrder: 'preorder',
        preorderShipsFrom: '2026-10-20',
      })
    ).toBe('Pre-order · Ships from 20 Oct 2026')
    expect(formatOrderItemPreorderNote({ salesModeAtOrder: 'preorder' })).toBe('Pre-order')
    expect(formatOrderItemPreorderNote({})).toBe('')
    expect(orderIncludesPreorder({ hasPreorderItems: true, items: [] })).toBe(true)
    expect(
      orderIncludesPreorder({ items: [{ salesModeAtOrder: 'preorder' }] })
    ).toBe(true)
    expect(orderIncludesPreorder({ items: [{ name: 'x' } as any] })).toBe(false)
  })
})

describe('order preorder snapshot', () => {
  it('snapshots open preorder lines and detects hasPreorderItems', () => {
    const snap = buildOrderItemPreorderSnapshot(openPreorder)
    expect(snap).toEqual({
      salesModeAtOrder: 'preorder',
      preorderShipsFrom: '2026-10-20',
    })
    expect(orderHasPreorderItems([{ salesModeAtOrder: 'preorder' }])).toBe(true)
    expect(orderHasPreorderItems([{ name: 'x' } as any])).toBe(false)
  })

  it('rejects coming soon and closed preorder on server assert', () => {
    expect(() =>
      assertMarketSCatalogAllowsPurchase(
        { category: 'HotGoods', name: 'Drop', salesMode: 'coming_soon' },
        1
      )
    ).toThrow(/coming soon/i)
    expect(() =>
      assertMarketSCatalogAllowsPurchase(
        {
          category: 'HotGoods',
          name: 'Drop',
          salesMode: 'preorder',
          preorderSupplierConfirmed: false,
          preorderShipsFrom: '2026-10-20',
        },
        1
      )
    ).toThrow(/not available/i)
    expect(() => assertMarketSCatalogAllowsPurchase(openPreorder, 1)).not.toThrow()
  })
})

describe('Market S preorder countdown', () => {
  const closesSoon = '2026-10-25T12:00:00.000Z'
  const base = {
    category: 'HotGoods' as const,
    salesMode: 'preorder' as const,
    preorderSupplierConfirmed: true,
    preorderShipsFrom: '2026-11-01',
    preorderClosesAt: closesSoon,
    preorderCountdownEnabled: true,
  }

  it('shows only when admin enabled, open, and within 7-day window', () => {
    const now = new Date('2026-10-20T12:00:00.000Z') // 5 days left
    expect(shouldShowMarketSPreorderCountdown(base, now)).toBe(true)
    expect(
      shouldShowMarketSPreorderCountdown({ ...base, preorderCountdownEnabled: false }, now)
    ).toBe(false)
    expect(
      shouldShowMarketSPreorderCountdown({ ...base, preorderClosesAt: undefined }, now)
    ).toBe(false)
    // Outside window (>7 days)
    expect(shouldShowMarketSPreorderCountdown(base, new Date('2026-10-10T12:00:00.000Z'))).toBe(
      false
    )
    // Already closed
    expect(shouldShowMarketSPreorderCountdown(base, new Date('2026-10-26T12:00:00.000Z'))).toBe(
      false
    )
  })

  it('returns day/hour/minute parts when visible', () => {
    const now = new Date('2026-10-24T12:00:00.000Z') // 1 day left
    const parts = getMarketSPreorderCountdownParts(base, now)
    expect(parts).not.toBeNull()
    expect(parts!.days).toBe(1)
    expect(parts!.hours).toBe(0)
    expect(parts!.minutes).toBe(0)
  })
})
