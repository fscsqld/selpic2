import { describe, expect, it } from 'vitest'
import {
  productCardHasCatalogRating,
  resolveProductCardImageLayout,
} from './productCardImageLayout'

describe('resolveProductCardImageLayout', () => {
  it('defaults to compact for missing or unknown values', () => {
    expect(resolveProductCardImageLayout(undefined)).toBe('compact')
    expect(resolveProductCardImageLayout(null)).toBe('compact')
    expect(resolveProductCardImageLayout('')).toBe('compact')
    expect(resolveProductCardImageLayout('wide')).toBe('compact')
  })

  it('accepts full for Market S–style hub cards', () => {
    expect(resolveProductCardImageLayout('full')).toBe('full')
  })
})

describe('productCardHasCatalogRating', () => {
  it('requires a positive finite number', () => {
    expect(productCardHasCatalogRating(undefined)).toBe(false)
    expect(productCardHasCatalogRating(null)).toBe(false)
    expect(productCardHasCatalogRating(0)).toBe(false)
    expect(productCardHasCatalogRating(4.8)).toBe(true)
  })
})
