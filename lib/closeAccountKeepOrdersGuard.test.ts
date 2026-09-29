import { describe, expect, it } from 'vitest'
import { assertCloseAccountKeepsOrders } from './closeAccountKeepOrdersGuard'

describe('assertCloseAccountKeepsOrders', () => {
  it('allows likes/cart cleanup lists', () => {
    expect(assertCloseAccountKeepsOrders(['product_likes', 'cart_items', 'profiles'])).toBe(true)
  })

  it('rejects any plan that deletes orders', () => {
    expect(assertCloseAccountKeepsOrders(['product_likes', 'orders'])).toBe(false)
  })
})
