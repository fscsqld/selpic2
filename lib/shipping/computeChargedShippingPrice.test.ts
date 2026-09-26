import { describe, expect, it } from 'vitest'
import { computeChargedShippingPrice } from './computeChargedShippingPrice'
import {
  MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION,
  MARKET_S_UNTRACKED_LETTER_OPTION,
  MARKET_S_UNTRACKED_LETTER_PRICE,
} from './marketSLetterOption'

describe('computeChargedShippingPrice', () => {
  const freeOff = { enabled: false, threshold: 50 }
  const freeOn = { enabled: true, threshold: 50 }

  it('charges Market S untracked letter at $3.20 with free-ship settings off', () => {
    expect(
      computeChargedShippingPrice(MARKET_S_UNTRACKED_LETTER_OPTION, 10, freeOff, false)
    ).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
    expect(
      computeChargedShippingPrice(MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION, 10, freeOff, false)
    ).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
  })

  it('keeps Market S letter charged when threshold is met (not free-on-threshold)', () => {
    expect(
      computeChargedShippingPrice(MARKET_S_UNTRACKED_LETTER_CHECKOUT_OPTION, 80, freeOn, false)
    ).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
  })

  it('returns 0 for VIP free shipping and alwaysFree options', () => {
    expect(
      computeChargedShippingPrice(MARKET_S_UNTRACKED_LETTER_OPTION, 10, freeOff, true)
    ).toBe(0)
    expect(
      computeChargedShippingPrice(
        { id: 'pickup', price: 0, alwaysFree: true },
        10,
        freeOff,
        false
      )
    ).toBe(0)
  })

  it('applies threshold free / discount on CMS parcel-style options', () => {
    expect(
      computeChargedShippingPrice(
        { id: 'standard-letter', price: 2.4, freeShippingWhenThresholdMet: true },
        50,
        freeOn,
        false
      )
    ).toBe(0)
    expect(
      computeChargedShippingPrice(
        { id: 'parcel-post', price: 10.9, discountWhenThresholdMet: 2.4 },
        50,
        freeOn,
        false
      )
    ).toBe(8.5)
  })
})
