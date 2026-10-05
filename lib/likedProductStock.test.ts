import { describe, expect, it } from 'vitest'
import {
  isProductOutOfStock,
  likedProductStockLabel,
  resolveLikedProductStockStatus,
} from './likedProductStock'

describe('resolveLikedProductStockStatus', () => {
  it('uses stockQuantity when set', () => {
    expect(resolveLikedProductStockStatus({ inStock: true, stockQuantity: 0 })).toBe('out_of_stock')
    expect(resolveLikedProductStockStatus({ inStock: false, stockQuantity: 3 })).toBe('in_stock')
  })

  it('falls back to inStock flag', () => {
    expect(resolveLikedProductStockStatus({ inStock: true })).toBe('in_stock')
    expect(resolveLikedProductStockStatus({ inStock: false })).toBe('out_of_stock')
  })

  it('marks missing catalog rows unavailable', () => {
    expect(resolveLikedProductStockStatus(null)).toBe('unavailable')
    expect(resolveLikedProductStockStatus(undefined)).toBe('unavailable')
    expect(likedProductStockLabel('out_of_stock')).toBe('Out of stock')
  })
})

describe('isProductOutOfStock', () => {
  it('is true for zero stock or missing product', () => {
    expect(isProductOutOfStock({ inStock: true, stockQuantity: 0 })).toBe(true)
    expect(isProductOutOfStock({ inStock: false })).toBe(true)
    expect(isProductOutOfStock(null)).toBe(true)
  })

  it('is false when stock or inStock allows purchase', () => {
    expect(isProductOutOfStock({ inStock: true, stockQuantity: 2 })).toBe(false)
    expect(isProductOutOfStock({ inStock: true })).toBe(false)
  })

  it('allows open Market S pre-order at stock 0', () => {
    expect(
      isProductOutOfStock({
        category: 'HotGoods',
        salesMode: 'preorder',
        preorderSupplierConfirmed: true,
        preorderShipsFrom: '2026-10-20',
        stockQuantity: 0,
        inStock: false,
      })
    ).toBe(false)
  })

  it('keeps coming_soon unpurchasable', () => {
    expect(
      isProductOutOfStock({
        category: 'HotGoods',
        salesMode: 'coming_soon',
        stockQuantity: 0,
        inStock: false,
      })
    ).toBe(true)
  })
})
