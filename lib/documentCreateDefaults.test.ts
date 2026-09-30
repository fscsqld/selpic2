import { describe, expect, it } from 'vitest'
import {
  applyMarketSShippingOptionToLine,
  getDefaultNotesByCategory,
  isMarketSSelectableProductLine,
  isMarketSShippingLine,
  listDocumentShippingOptionsForSelect,
  MARKET_S_SHIPPING_CUSTOM,
  MARKET_S_SHIPPING_PLACEHOLDER,
  resolveMarketSShippingSelectValue,
} from './documentCreateDefaults'

describe('document create notes', () => {
  it('omits payment-due wording for every business type', () => {
    for (const category of ['sticker', 'market-s', 'cleaning'] as const) {
      const notes = getDefaultNotesByCategory(category)
      expect(notes.toLowerCase()).not.toMatch(/payment is due/)
      expect(notes.toLowerCase()).not.toMatch(/within 7 days/)
    }
  })
})

describe('Market S document shipping line', () => {
  const options = listDocumentShippingOptionsForSelect([
    {
      id: 'parcel-post',
      name: 'Parcel Post (Goods)',
      price: 11.7,
      isActive: true,
      order: 4,
    },
    {
      id: 'market-s-untracked-letter',
      name: 'Untracked letter (Market S singles)',
      price: 3.7,
      isActive: true,
      order: 0,
    },
    {
      id: 'inactive',
      name: 'Hidden',
      price: 9,
      isActive: false,
      order: 9,
    },
  ])

  it('lists only active CMS options sorted by order', () => {
    expect(options.map((o) => o.id)).toEqual([
      'market-s-untracked-letter',
      'parcel-post',
    ])
  })

  it('treats placeholder and Shipping — name as shipping lines, not pack class', () => {
    expect(isMarketSShippingLine(MARKET_S_SHIPPING_PLACEHOLDER)).toBe(true)
    expect(isMarketSShippingLine('Shipping — Parcel Post (Goods)')).toBe(true)
    expect(isMarketSSelectableProductLine(MARKET_S_SHIPPING_PLACEHOLDER)).toBe(false)
    expect(isMarketSSelectableProductLine('Market S — Single Item')).toBe(true)
  })

  it('resolves select value and auto-fills CMS price on apply', () => {
    expect(resolveMarketSShippingSelectValue(MARKET_S_SHIPPING_PLACEHOLDER, options)).toBe('')
    expect(
      resolveMarketSShippingSelectValue('Shipping — Parcel Post (Goods)', options)
    ).toBe('parcel-post')
    expect(
      resolveMarketSShippingSelectValue('Shipping — Special courier', options)
    ).toBe(MARKET_S_SHIPPING_CUSTOM)

    const applied = applyMarketSShippingOptionToLine(
      { description: MARKET_S_SHIPPING_PLACEHOLDER, qty: 1, unitPrice: 0, taxRate: 0.1 },
      options.find((o) => o.id === 'parcel-post')
    )
    expect(applied.description).toBe('Shipping — Parcel Post (Goods)')
    expect(applied.unitPrice).toBe(11.7)
    expect(applied.taxRate).toBe(0)
  })

  it('falls back to code defaults when CMS list is empty', () => {
    const fallback = listDocumentShippingOptionsForSelect([])
    expect(fallback.some((o) => o.id === 'parcel-post')).toBe(true)
    expect(fallback.some((o) => o.id === 'express-post')).toBe(true)
  })
})
