import { describe, expect, it } from 'vitest'
import {
  productCardHasAnyMerchBadge,
  resolveProductCardMerchBadges,
} from './productCardMerchBadges'

describe('resolveProductCardMerchBadges', () => {
  it('shows New / Best Seller / Popular / Limited when admin flags are set', () => {
    const badges = resolveProductCardMerchBadges({
      isNew: true,
      isBestSeller: true,
      isPopular: true,
      isLimitedEdition: true,
      price: 10,
      originalPrice: 10,
    })
    expect(badges.showNewArrival).toBe(true)
    expect(badges.showBestSeller).toBe(true)
    expect(badges.showPopular).toBe(true)
    expect(badges.showLimitedEdition).toBe(true)
    expect(badges.showDiscount).toBe(false)
  })

  it('shows discount from originalPrice > price even with no merch flags', () => {
    const badges = resolveProductCardMerchBadges({
      price: 8,
      originalPrice: 10,
    })
    expect(badges.showDiscount).toBe(true)
    expect(badges.showNewArrival).toBe(false)
    expect(productCardHasAnyMerchBadge(badges)).toBe(true)
  })

  it('ignores false / missing merch flags', () => {
    const badges = resolveProductCardMerchBadges({
      isNew: false,
      price: 5,
    })
    expect(productCardHasAnyMerchBadge(badges)).toBe(false)
  })
})
