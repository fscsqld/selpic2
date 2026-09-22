import { describe, expect, it } from 'vitest'
import { cartAlreadyHasProduct, findMarketSBaitProduct } from './marketSBaitProduct'
import type { Product } from '@/lib/store'

function product(partial: Partial<Product> & Pick<Product, 'id' | 'name' | 'price'>): Product {
  return {
    image: '/images/placeholder.jpg',
    category: 'HotGoods',
    description: '',
    inStock: true,
    isHotGoods: true,
    ...partial,
  }
}

describe('Market S bait product', () => {
  it('finds an in-stock Mediheel $2.50 HotGoods SKU and ignores near-misses', () => {
    const bait = product({
      id: 'mediheel-1',
      name: 'Mediheel Tea Tree mask',
      price: 2.5,
      brand: 'Mediheel',
    })
    const found = findMarketSBaitProduct([
      product({ id: 'other', name: 'Sunscreen', price: 12, category: 'HotGoods' }),
      product({ id: 'sticker', name: 'Mediheel sticker', price: 2.5, category: 'Stickers', isHotGoods: false }),
      product({ id: 'sold', name: 'Mediheel Tea Tree', price: 2.5, inStock: false, stockQuantity: 0 }),
      bait,
    ])
    expect(found?.id).toBe('mediheel-1')
    expect(findMarketSBaitProduct([])).toBeNull()
  })

  it('does not prompt again when the bait SKU is already in the cart', () => {
    expect(cartAlreadyHasProduct(['abc', 'mediheel-1'], 'mediheel-1')).toBe(true)
    expect(cartAlreadyHasProduct(['abc'], 'mediheel-1')).toBe(false)
  })
})
