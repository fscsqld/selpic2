import { describe, expect, it } from 'vitest'
import {
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
