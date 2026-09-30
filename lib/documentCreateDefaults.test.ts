import { describe, expect, it } from 'vitest'
import {
  applyDocumentShippingOptionToLine,
  buildCleaningServiceDescription,
  buildMarketSLineDescription,
  CLEANING_SERVICE_CUSTOM,
  DOCUMENT_SHIPPING_CUSTOM,
  DOCUMENT_SHIPPING_PLACEHOLDER,
  getCleaningServiceExtraDetails,
  getDefaultNotesByCategory,
  getMarketSLineExtraDetails,
  getStickerDefaultLineItems,
  isDocumentShippingLine,
  isMarketSSelectableProductLine,
  listDocumentShippingOptionsForSelect,
  MARKET_S_LINE_CUSTOM,
  resolveDocumentShippingSelectValue,
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

describe('cleaning / Market S / sticker line typing spaces', () => {
  it('preserves spaces in Cleaning Extra details (no per-keystroke trim)', () => {
    const withTrailing = buildCleaningServiceDescription(
      'Regular Cleaning Service (per visit)',
      'Selpic Cleaning '
    )
    expect(withTrailing).toBe('Regular Cleaning Service (per visit)\nSelpic Cleaning ')
    expect(getCleaningServiceExtraDetails(withTrailing)).toBe('Selpic Cleaning ')

    const customSpaces = buildCleaningServiceDescription(CLEANING_SERVICE_CUSTOM, 'Custom job ')
    expect(customSpaces).toBe('Custom job ')
  })

  it('preserves spaces in Market S Brand / product details', () => {
    const marketS = buildMarketSLineDescription('Market S — Single Item', 'Mediheel 15ml ')
    expect(marketS).toBe('Market S — Single Item\nMediheel 15ml ')
    expect(getMarketSLineExtraDetails(marketS)).toBe('Mediheel 15ml ')

    const marketCustom = buildMarketSLineDescription(MARKET_S_LINE_CUSTOM, 'Other SKU ')
    expect(marketCustom).toBe('Other SKU ')
  })

  it('omits extra line only when extra is empty string (not whitespace-only trim)', () => {
    expect(buildCleaningServiceDescription('Fit Out Cleaning', '')).toBe('Fit Out Cleaning')
    // A single space is intentional typing — keep the second line
    expect(buildCleaningServiceDescription('Fit Out Cleaning', ' ')).toBe('Fit Out Cleaning\n ')
    expect(buildMarketSLineDescription('Market S — Family Bundle', '')).toBe(
      'Market S — Family Bundle'
    )
    expect(buildMarketSLineDescription('Market S — Family Bundle', ' ')).toBe(
      'Market S — Family Bundle\n '
    )
  })
})

describe('document shipping line (Market S + Stickers)', () => {
  const cms = [
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
      id: 'standard-letter',
      name: 'Standard Letter',
      price: 3.7,
      isActive: true,
      order: 1,
    },
    {
      id: 'inactive',
      name: 'Hidden',
      price: 9,
      isActive: false,
      order: 9,
    },
  ]

  it('lists only active CMS options; stickers hide Market S letter', () => {
    expect(listDocumentShippingOptionsForSelect(cms, 'market-s').map((o) => o.id)).toEqual([
      'market-s-untracked-letter',
      'standard-letter',
      'parcel-post',
    ])
    expect(listDocumentShippingOptionsForSelect(cms, 'sticker').map((o) => o.id)).toEqual([
      'standard-letter',
      'parcel-post',
    ])
  })

  it('uses live CMS price when applying an option (future admin price edits)', () => {
    const raised = {
      id: 'parcel-post',
      name: 'Parcel Post (Goods)',
      price: 12.5,
      isActive: true,
    }
    const applied = applyDocumentShippingOptionToLine(
      { description: DOCUMENT_SHIPPING_PLACEHOLDER, qty: 1, unitPrice: 0, taxRate: 0.1 },
      raised
    )
    expect(applied.unitPrice).toBe(12.5)
    expect(applied.description).toBe('Shipping — Parcel Post (Goods)')
  })

  it('treats placeholder and Shipping — name as shipping lines, not pack class', () => {
    expect(isDocumentShippingLine(DOCUMENT_SHIPPING_PLACEHOLDER)).toBe(true)
    expect(isDocumentShippingLine('Shipping — Parcel Post (Goods)')).toBe(true)
    expect(isDocumentShippingLine('Shipping (Standard)')).toBe(true)
    expect(isMarketSSelectableProductLine(DOCUMENT_SHIPPING_PLACEHOLDER)).toBe(false)
    expect(isMarketSSelectableProductLine('Market S — Single Item')).toBe(true)
  })

  it('resolves select value and auto-fills CMS price on apply', () => {
    const options = listDocumentShippingOptionsForSelect(cms, 'market-s')
    expect(resolveDocumentShippingSelectValue(DOCUMENT_SHIPPING_PLACEHOLDER, options)).toBe('')
    expect(resolveDocumentShippingSelectValue('Shipping (Standard)', options)).toBe('')
    expect(
      resolveDocumentShippingSelectValue('Shipping — Parcel Post (Goods)', options)
    ).toBe('parcel-post')
    expect(
      resolveDocumentShippingSelectValue('Shipping — Special courier', options)
    ).toBe(DOCUMENT_SHIPPING_CUSTOM)

    const applied = applyDocumentShippingOptionToLine(
      { description: DOCUMENT_SHIPPING_PLACEHOLDER, qty: 1, unitPrice: 0, taxRate: 0.1 },
      options.find((o) => o.id === 'parcel-post')
    )
    expect(applied.description).toBe('Shipping — Parcel Post (Goods)')
    expect(applied.unitPrice).toBe(11.7)
    expect(applied.taxRate).toBe(0)
  })

  it('seeds sticker shipping as AusPost placeholder at $0', () => {
    const items = getStickerDefaultLineItems()
    const shipping = items.find((i) => isDocumentShippingLine(i.description))
    expect(shipping?.description).toBe(DOCUMENT_SHIPPING_PLACEHOLDER)
    expect(shipping?.unitPrice).toBe(0)
  })

  it('falls back to code defaults when CMS list is empty', () => {
    const fallback = listDocumentShippingOptionsForSelect([], 'sticker')
    expect(fallback.some((o) => o.id === 'parcel-post')).toBe(true)
    expect(fallback.some((o) => o.id === 'express-post')).toBe(true)
    expect(fallback.some((o) => o.id === 'market-s-untracked-letter')).toBe(false)
  })
})
