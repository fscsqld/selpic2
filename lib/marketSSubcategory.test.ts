import { describe, expect, it } from 'vitest'
import {
  MARKET_S_RETIRED_MERCH_SUBCATEGORIES,
  MARKET_S_SHIPPING_SUBCATEGORIES,
  MARKET_S_SUBCATEGORY_VALUES,
  isMarketSCatalogProduct,
  isMarketSSubcategory,
  isRetiredMarketSMerchSubcategory,
  marketSProductSubcategoryOptions,
  marketSSubcategoryIcon,
} from './marketSSubcategory'

describe('Market S subcategories', () => {
  it('offers only Single Item and Family Bundle on the product form', () => {
    expect([...MARKET_S_SUBCATEGORY_VALUES]).toEqual(['Single Item', 'Family Bundle'])
    expect(MARKET_S_SHIPPING_SUBCATEGORIES).toEqual(['Single Item', 'Family Bundle'])
    expect(MARKET_S_RETIRED_MERCH_SUBCATEGORIES).toContain('Sunscreen')
    expect(isMarketSSubcategory('Sunscreen')).toBe(false)
    expect(isRetiredMarketSMerchSubcategory('Sunscreen')).toBe(true)
  })

  it('does not treat sticker subcategories as Market S values', () => {
    expect(isMarketSSubcategory('Basic')).toBe(false)
    expect(isMarketSSubcategory('Single Item')).toBe(true)
  })

  it('keeps icons for leftover merch SKUs so old hub chips still render', () => {
    expect(marketSSubcategoryIcon('Sunscreen')).toBe('☀️')
    expect(marketSSubcategoryIcon('Custom Legacy')).toBe('📦')
  })

  it('treats HotGoods category or isHotGoods as Market S catalog rows', () => {
    expect(isMarketSCatalogProduct({ category: 'HotGoods' })).toBe(true)
    expect(isMarketSCatalogProduct({ category: 'Stickers', isHotGoods: true })).toBe(true)
    expect(isMarketSCatalogProduct({ category: 'Stickers' })).toBe(false)
  })

  it('does not let CMS merch tiles or retired names back into Add Product', () => {
    const options = marketSProductSubcategoryOptions([
      { value: 'Sunscreen', label: 'Sunscreen', icon: '☀️' },
      { value: 'Limited Drop', label: 'Limited Drop', icon: '✨' },
    ])
    expect(options.map((row) => row.value)).toEqual([
      'Single Item',
      'Family Bundle',
      'Limited Drop',
    ])
  })

  it('keeps a leftover merch value visible only while editing that SKU', () => {
    const options = marketSProductSubcategoryOptions(
      [{ value: 'Sunscreen', label: 'Sunscreen' }],
      'Sunscreen'
    )
    expect(options.map((row) => row.value)).toEqual([
      'Single Item',
      'Family Bundle',
      'Sunscreen',
    ])
    expect(options[2].label).toContain('legacy')
  })
})
