import { describe, expect, it } from 'vitest'
import { computeChargedShippingPrice } from './computeChargedShippingPrice'
import {
  buildMarketSUntrackedLetterCheckoutOption,
  buildMarketSUntrackedLetterPricingOption,
  MARKET_S_UNTRACKED_LETTER_PRICE,
} from './marketSLetterOption'

describe('computeChargedShippingPrice', () => {
  const freeOff = { enabled: false, threshold: 70 }
  const freeOn = { enabled: true, threshold: 70 }

  it('charges Market S untracked letter at the AusPost large-letter ≤125g rate when free-ship is off', () => {
    const option = buildMarketSUntrackedLetterPricingOption(true)
    expect(computeChargedShippingPrice(option, 10, freeOff, false)).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
    expect(
      computeChargedShippingPrice(buildMarketSUntrackedLetterCheckoutOption(true), 10, freeOff, false)
    ).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
  })

  it('makes Market S letter free at threshold when Admin flag is on (default)', () => {
    const option = buildMarketSUntrackedLetterPricingOption(true)
    expect(computeChargedShippingPrice(option, 80, freeOn, false)).toBe(0)
  })

  it('keeps Market S letter charged at threshold when Admin flag is off', () => {
    const option = buildMarketSUntrackedLetterPricingOption(false)
    expect(computeChargedShippingPrice(option, 80, freeOn, false)).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
  })

  it('returns 0 for VIP free shipping and alwaysFree options', () => {
    expect(
      computeChargedShippingPrice(buildMarketSUntrackedLetterPricingOption(true), 10, freeOff, true)
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
        { id: 'standard-letter', price: 3.7, freeShippingWhenThresholdMet: true },
        70,
        freeOn,
        false
      )
    ).toBe(0)
    expect(
      computeChargedShippingPrice(
        { id: 'parcel-post', price: 11.7, discountWhenThresholdMet: 2.4 },
        70,
        freeOn,
        false
      )
    ).toBe(9.3)
  })
})
