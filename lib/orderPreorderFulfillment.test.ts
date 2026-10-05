import { describe, expect, it } from 'vitest'
import {
  applyNewPreorderShipsFromToItems,
  buildPreorderDelayEmailHtml,
  formatPreorderDispatchSummaryLines,
  getEarliestPreorderShipsFrom,
  MARKET_S_PREORDER_DELAY_DEFAULT_REASON,
} from './orderPreorderFulfillment'
import type { OrderRecord } from './store'

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

  it('builds delay email matching owner sample structure with Title Case name', () => {
    const order = {
      id: 'ORD-muuv8629',
      customer: { name: 'EMMA kim', email: 'emma@example.com' },
      items: [
        {
          productId: 'a',
          name: 'DERMAFIX Perfect Real Performance Vita Collagen Mask',
          price: 1,
          image: '/x',
          quantity: 1,
          customizations: {},
          salesModeAtOrder: 'preorder',
          preorderShipsFrom: '2026-11-01',
        },
      ],
    } as OrderRecord

    const html = buildPreorderDelayEmailHtml({
      order,
      previousShipsFrom: '2026-11-01',
      newShipsFrom: '2026-11-30',
    })

    expect(html).toContain('Dear Emma Kim,')
    expect(html).toContain('Thank you for your patience. We are writing to inform you')
    expect(html).toContain(MARKET_S_PREORDER_DELAY_DEFAULT_REASON)
    expect(html).toContain('Updated Ship Date')
    expect(html).toContain('Order ID:')
    expect(html).toContain('ORD-muuv8629')
    expect(html).toContain('Pre-order Item:')
    expect(html).toContain('Previous Ship Date:')
    expect(html).toContain('New Ship Date:')
    expect(html).toContain('AusPost transit times start after we dispatch')
    expect(html).toContain('We sincerely apologize for this delay')
  })

  it('uses admin note as reason when provided', () => {
    const order = {
      id: 'ORD-1',
      customer: { name: 'Sam', email: 'sam@example.com' },
      items: [
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
      ],
    } as OrderRecord

    const html = buildPreorderDelayEmailHtml({
      order,
      previousShipsFrom: '2026-11-01',
      newShipsFrom: '2026-12-01',
      adminNote: 'Factory production slipped by two weeks.',
    })
    expect(html).toContain('Factory production slipped by two weeks.')
    expect(html).not.toContain(MARKET_S_PREORDER_DELAY_DEFAULT_REASON)
  })
})
