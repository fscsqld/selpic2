import { describe, expect, it } from 'vitest'
import {
  applyNewPreorderShipsFromToItems,
  formatPreorderDispatchSummaryLines,
  getEarliestPreorderShipsFrom,
} from './orderPreorderFulfillment'

describe('orderPreorderFulfillment', () => {
  it('picks earliest ships-from among preorder lines', () => {
    expect(
      getEarliestPreorderShipsFrom([
        { salesModeAtOrder: 'preorder', preorderShipsFrom: '2026-11-15' },
        { salesModeAtOrder: 'preorder', preorderShipsFrom: '2026-11-01' },
        { salesModeAtOrder: undefined, preorderShipsFrom: '2026-10-01' },
      ])
    ).toBe('2026-11-01')
  })

  it('applies new ships-from only to preorder lines', () => {
    const next = applyNewPreorderShipsFromToItems(
      [
        {
          productId: 'a',
          name: 'Mask',
          price: 1,
          image: '/x',
          quantity: 1,
          customizations: {},
          salesModeAtOrder: 'preorder',
          preorderShipsFrom: '2026-11-01',
        },
        {
          productId: 'b',
          name: 'Sticker',
          price: 1,
          image: '/x',
          quantity: 1,
          customizations: {},
          category: 'Stickers',
        },
      ],
      '2026-12-01'
    )
    expect(next[0].preorderShipsFrom).toBe('2026-12-01')
    expect(next[1].preorderShipsFrom).toBeUndefined()
  })

  it('labels transit after dispatch for preorder shipping summary', () => {
    const dispatch = formatPreorderDispatchSummaryLines({
      hasPreorderItems: true,
      items: [
        {
          salesModeAtOrder: 'preorder',
          preorderShipsFrom: '2026-11-01',
        },
      ],
      shippingDeliveryTime: '2–8 business days',
      shippingType: 'delivery',
    } as any)
    expect(dispatch.some((l) => /on or after/i.test(l))).toBe(true)
    expect(dispatch.some((l) => /Transit after dispatch/i.test(l))).toBe(true)
  })
})
