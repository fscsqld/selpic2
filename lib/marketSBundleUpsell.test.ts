import { describe, expect, it } from 'vitest'
import type { Product } from './store'
import {
  familyBundleUnitCountForSave,
  getMarketSBundleUpsellOffers,
  linkedFamilyBundleIdsForSave,
  buildMarketSBundleSwapUndo,
  parseMarketSBundleSwapUndos,
  pruneMarketSBundleSwapUndos,
  resolveFamilyBundleUnitCount,
  resolveLinkedFamilyBundles,
  sanitizeLinkedFamilyBundleIds,
} from './marketSBundleUpsell'

function hot(partial: Partial<Product> & Pick<Product, 'id' | 'name' | 'price' | 'subcategory'>): Product {
  return {
    image: '/x.webp',
    category: 'HotGoods',
    description: '',
    inStock: true,
    isHotGoods: true,
    ...partial,
  }
}

const single = hot({
  id: 's1',
  name: 'Mask Single',
  price: 6.5,
  subcategory: 'Single Item',
  linkedFamilyBundleIds: ['b5', 'b10'],
})

const bundle5 = hot({
  id: 'b5',
  name: 'Family 5-pack',
  price: 22,
  subcategory: 'Family Bundle',
  familyBundleUnitCount: 5,
})

const bundle10 = hot({
  id: 'b10',
  name: 'Family 10-pack',
  price: 38,
  subcategory: 'Family Bundle',
  familyBundleUnitCount: 10,
})

describe('sanitizeLinkedFamilyBundleIds', () => {
  it('dedupes and trims', () => {
    expect(sanitizeLinkedFamilyBundleIds([' b5 ', 'b5', '', 'b10'])).toEqual(['b5', 'b10'])
  })
})

describe('resolveFamilyBundleUnitCount', () => {
  it('uses explicit count then size/name fallback', () => {
    expect(resolveFamilyBundleUnitCount(bundle5)).toBe(5)
    expect(
      resolveFamilyBundleUnitCount(
        hot({ id: 'x', name: 'Parents Pack', price: 20, subcategory: 'Family Bundle', size: '5 sheets' })
      )
    ).toBe(5)
  })
})

describe('resolveLinkedFamilyBundles', () => {
  it('returns sellable Family Bundle SKUs only', () => {
    const oos = { ...bundle5, inStock: false }
    expect(resolveLinkedFamilyBundles(single, [single, oos, bundle10]).map((p) => p.id)).toEqual([
      'b10',
    ])
  })
})

describe('getMarketSBundleUpsellOffers', () => {
  it('offers from qty 1 when per-unit bundle price beats the single', () => {
    const offers = getMarketSBundleUpsellOffers(
      [{ product: single, quantity: 1 }],
      [single, bundle5, bundle10]
    )
    // $6.50 vs $22/5=$4.40 and $38/10=$3.80
    expect(offers).toHaveLength(2)
    expect(offers[0].bundle.id).toBe('b10')
    expect(offers[0].bundleUnitPrice).toBe(3.8)
    expect(offers[0].unitSavings).toBe(2.7)
    expect(offers[1].bundle.id).toBe('b5')
    expect(offers[1].unitSavings).toBe(2.1)
  })

  it('hides offers when pack count missing or unit price not better', () => {
    const expensive = { ...bundle5, price: 40, familyBundleUnitCount: 5 }
    const noCount = { ...bundle10, familyBundleUnitCount: undefined, name: 'Family Pack', size: '' }
    expect(
      getMarketSBundleUpsellOffers([{ product: single, quantity: 1 }], [single, expensive, noCount])
    ).toHaveLength(0)
  })
})

describe('bundle swap undo helpers', () => {
  it('parses and prunes when bundle was removed from cart', () => {
    const undo = buildMarketSBundleSwapUndo({
      bundleProductId: 'b5',
      bundleName: 'Family 5-pack',
      bundleQtyBefore: 0,
      singleProductId: 's1',
      singleName: 'Mask Single',
      singleQuantity: 1,
    })
    const parsed = parseMarketSBundleSwapUndos(JSON.stringify([undo]))
    expect(parsed).toHaveLength(1)
    expect(
      pruneMarketSBundleSwapUndos(parsed, [{ product: bundle5, quantity: 1 }])
    ).toHaveLength(1)
    expect(pruneMarketSBundleSwapUndos(parsed, [])).toHaveLength(0)
    expect(
      pruneMarketSBundleSwapUndos(parsed, [{ product: bundle5, quantity: 0 }])
    ).toHaveLength(0)
  })
})
