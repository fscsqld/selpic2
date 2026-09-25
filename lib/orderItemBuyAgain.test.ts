import { describe, expect, it, vi } from 'vitest'

vi.mock('./productCustomization', () => ({
  isCustomizationRequired: (product: { category?: string }) =>
    (product.category || '').trim().toLowerCase() === 'stickers',
  getCustomizationPath: (product: { id: string }) =>
    `/stickers/customize?product=${encodeURIComponent(product.id)}`,
}))

import { resolveOrderItemBuyAgain } from './orderItemBuyAgain'

describe('resolveOrderItemBuyAgain', () => {
  it('sends sticker SKUs to customize when in stock', () => {
    const r = resolveOrderItemBuyAgain({
      id: 's1',
      category: 'Stickers',
      subcategory: 'Basic',
      inStock: true,
      stockQuantity: 5,
      customizationOptions: [],
    })
    expect(r.status).toBe('in_stock')
    expect(r.href).toContain('/stickers/customize')
    expect(r.ctaLabel).toBe('Buy again')
  })

  it('uses PDP View details when out of stock', () => {
    const r = resolveOrderItemBuyAgain({
      id: 's1',
      category: 'Stickers',
      subcategory: 'Basic',
      inStock: false,
      stockQuantity: 0,
    })
    expect(r.status).toBe('out_of_stock')
    expect(r.href).toBe('/products/s1')
    expect(r.ctaLabel).toBe('View details')
  })

  it('marks missing catalogue products unavailable', () => {
    const r = resolveOrderItemBuyAgain(null)
    expect(r.status).toBe('unavailable')
    expect(r.href).toBeNull()
    expect(r.ctaLabel).toBeNull()
  })

  it('uses PDP for simple Market S singles', () => {
    const r = resolveOrderItemBuyAgain({
      id: 'm1',
      category: 'HotGoods',
      subcategory: 'Single Item',
      inStock: true,
      stockQuantity: 2,
    })
    expect(r.href).toBe('/products/m1')
    expect(r.ctaLabel).toBe('Buy again')
  })
})
