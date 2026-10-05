import { describe, expect, it } from 'vitest'
import {
  buildOrderConfirmationThankYouIntro,
  classifyOrderCatalogMix,
  isOrderLineMarketS,
  isOrderLineSticker,
} from './orderConfirmationCatalogMix'
import { getOrderConfirmationPaymentNoticeForOrder } from './orderConfirmationPaymentNotice'

describe('classifyOrderCatalogMix', () => {
  it('detects stickers only, Market S only, and mixed', () => {
    expect(
      classifyOrderCatalogMix([{ category: 'Stickers', isHotGoods: false }]).mix
    ).toBe('stickers_only')
    expect(
      classifyOrderCatalogMix([{ category: 'HotGoods', isHotGoods: true }]).mix
    ).toBe('market_s_only')
    expect(
      classifyOrderCatalogMix([
        { category: 'Stickers' },
        { category: 'HotGoods', isHotGoods: true },
      ]).mix
    ).toBe('mixed')
  })

  it('classifies lines for email copy', () => {
    expect(isOrderLineSticker({ category: 'Stickers' })).toBe(true)
    expect(isOrderLineMarketS({ category: 'HotGoods', isHotGoods: true })).toBe(true)
  })
})

describe('order confirmation copy by mix', () => {
  it('uses Market S intro and payment tail (not stickers)', () => {
    const intro = buildOrderConfirmationThankYouIntro('market_s_only')
    expect(intro).toMatch(/Market S order/)
    expect(intro).not.toMatch(/custom stickers/)
    const pay = getOrderConfirmationPaymentNoticeForOrder('bank', [
      {
        productId: 'm1',
        name: 'Mask',
        price: 7.5,
        image: '/x.webp',
        quantity: 2,
        customizations: {},
        category: 'HotGoods',
        isHotGoods: true,
      },
    ])
    expect(pay).toMatch(/Market S order/)
    expect(pay).not.toMatch(/custom stickers/)
  })

  it('keeps sticker intro for Stickers-only', () => {
    const intro = buildOrderConfirmationThankYouIntro('stickers_only')
    expect(intro).toMatch(/custom stickers/)
    expect(intro).not.toMatch(/Market S order/)
  })

  it('uses mixed intro when both categories appear', () => {
    const intro = buildOrderConfirmationThankYouIntro('mixed')
    expect(intro).toMatch(/custom stickers and Market S/)
  })
})
