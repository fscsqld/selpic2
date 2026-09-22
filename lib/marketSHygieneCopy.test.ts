import { describe, expect, it } from 'vitest'
import { cartContainsMarketSGoods, MARKET_S_HYGIENE_CHECKOUT } from './marketSHygieneCopy'

describe('Market S hygiene copy', () => {
  it('flags HotGoods in mixed carts and keeps ACL language in the checkout ack', () => {
    expect(
      cartContainsMarketSGoods([
        { category: 'Stickers' },
        { category: 'HotGoods', isHotGoods: true },
      ])
    ).toBe(true)
    expect(cartContainsMarketSGoods([{ category: 'Stickers' }])).toBe(false)
    expect(cartContainsMarketSGoods([])).toBe(false)
    expect(MARKET_S_HYGIENE_CHECKOUT).toMatch(/Australian Consumer Law/)
    expect(MARKET_S_HYGIENE_CHECKOUT).toMatch(/faulty/i)
  })
})
