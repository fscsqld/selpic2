import { describe, expect, it } from 'vitest'
import {
  MARKET_S_HUB_FILTER_ALL,
  MARKET_S_HUB_FILTER_PREORDER,
  marketSHubFilterOptions,
  normalizeMarketSHubFilter,
  productMatchesMarketSHubFilter,
} from './marketSHubFilter'

describe('Market S hub filters', () => {
  it('lists shipping classes then leftover product subcategories', () => {
    expect(marketSHubFilterOptions(['Sunscreen', 'Single Item']).map((row) => row.value)).toEqual([
      'Single Item',
      'Family Bundle',
      'Sunscreen',
    ])
  })

  it('matches HotGoods SKUs by subcategory, including legacy other- values', () => {
    const single = { category: 'HotGoods', subcategory: 'Single Item' }
    const bundle = { category: 'HotGoods', subcategory: 'Family Bundle' }
    const leftover = { category: 'HotGoods', subcategory: 'Sunscreen' }

    expect(normalizeMarketSHubFilter('other-Single Item')).toBe('Single Item')
    expect(productMatchesMarketSHubFilter(single, 'Single Item')).toBe(true)
    expect(productMatchesMarketSHubFilter(single, 'other-Single Item')).toBe(true)
    expect(productMatchesMarketSHubFilter(single, 'Family Bundle')).toBe(false)
    expect(productMatchesMarketSHubFilter(bundle, 'Family Bundle')).toBe(true)
    expect(productMatchesMarketSHubFilter(leftover, 'Sunscreen')).toBe(true)
    expect(productMatchesMarketSHubFilter(single, MARKET_S_HUB_FILTER_ALL)).toBe(true)
  })

  it('does not treat the first dash as a merch parent category', () => {
    const patch = { subcategory: 'Cool Patch' }
    expect(normalizeMarketSHubFilter('other-Cool Patch')).toBe('Cool Patch')
    expect(productMatchesMarketSHubFilter(patch, 'Cool Patch')).toBe(true)
    expect(productMatchesMarketSHubFilter(patch, 'other')).toBe(false)
  })

  it('preorder filter matches only open Market S pre-order SKUs', () => {
    const open = {
      category: 'HotGoods',
      subcategory: 'Single Item',
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderShipsFrom: '2026-10-20',
    }
    const normal = { category: 'HotGoods', subcategory: 'Single Item', salesMode: 'in_stock' }
    expect(normalizeMarketSHubFilter('preorder')).toBe(MARKET_S_HUB_FILTER_PREORDER)
    expect(productMatchesMarketSHubFilter(open, MARKET_S_HUB_FILTER_PREORDER)).toBe(true)
    expect(productMatchesMarketSHubFilter(normal, MARKET_S_HUB_FILTER_PREORDER)).toBe(false)
  })
})
