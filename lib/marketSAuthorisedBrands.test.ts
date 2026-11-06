import { describe, expect, it } from 'vitest'
import {
  createDefaultMarketSAuthorisedBrands,
  ensureMarketSAuthorisedBrands,
  findAuthorisedMarketSBrand,
  getActiveMarketSAuthorisedBrands,
  isAuthorisedMarketSBrand,
  normalizeMarketSBrandKey,
  type MarketSAuthorisedBrand,
} from './marketSAuthorisedBrands'

describe('Market S authorised brands', () => {
  it('normalises brand keys so spacing and case still match', () => {
    expect(normalizeMarketSBrandKey('DermaFirm')).toBe('dermafirm')
    expect(normalizeMarketSBrandKey('Derma Firm')).toBe('dermafirm')
    expect(normalizeMarketSBrandKey('  DERMA-FIRM ')).toBe('dermafirm')
    expect(normalizeMarketSBrandKey('')).toBe('')
  })

  it('matches product.brand against active authorised rows only', () => {
    const brands = createDefaultMarketSAuthorisedBrands()
    expect(isAuthorisedMarketSBrand(brands, 'Derma Firm')).toBe(true)
    expect(findAuthorisedMarketSBrand(brands, 'dermafirm')?.name).toBe('DermaFirm')

    brands[0].isActive = false
    expect(isAuthorisedMarketSBrand(brands, 'DermaFirm')).toBe(false)
  })

  it('does not treat a different brand as authorised', () => {
    const brands = createDefaultMarketSAuthorisedBrands()
    expect(isAuthorisedMarketSBrand(brands, 'Some Other Brand')).toBe(false)
    expect(isAuthorisedMarketSBrand(brands, '')).toBe(false)
  })

  it('lists only active brands sorted by order', () => {
    const now = new Date()
    const brands: MarketSAuthorisedBrand[] = [
      {
        id: 'b2',
        name: 'Brand B',
        order: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'b1',
        name: 'Brand A',
        order: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'b0',
        name: 'Hidden',
        order: 0,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      },
    ]
    expect(getActiveMarketSAuthorisedBrands(brands).map((b) => b.name)).toEqual([
      'Brand A',
      'Brand B',
    ])
  })

  it('seeds defaults when the CMS key was never stored; keeps explicit empty', () => {
    const seeded = ensureMarketSAuthorisedBrands(undefined, false)
    expect(seeded.length).toBe(1)
    expect(seeded[0].name).toBe('DermaFirm')

    expect(ensureMarketSAuthorisedBrands([], true)).toEqual([])
  })
})
