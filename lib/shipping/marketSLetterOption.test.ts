import { describe, expect, it } from 'vitest'
import {
  ensureMarketSUntrackedLetterInShippingOptions,
  MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  MARKET_S_UNTRACKED_LETTER_PRICE,
  resolveMarketSUntrackedLetterCheckoutOption,
  resolveMarketSUntrackedLetterPricingOption,
} from './marketSLetterOption'

describe('Market S letter CMS resolve', () => {
  it('falls back to code default price when CMS row is missing', () => {
    expect(resolveMarketSUntrackedLetterCheckoutOption(null, true).price).toBe(
      MARKET_S_UNTRACKED_LETTER_PRICE
    )
  })

  it('prefers CMS price / name for live Admin edits', () => {
    const row = resolveMarketSUntrackedLetterCheckoutOption(
      {
        id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
        name: 'Market S large letter',
        price: 4.5,
        description: 'Custom admin copy',
      },
      false
    )
    expect(row.price).toBe(4.5)
    expect(row.name).toBe('Market S large letter')
    expect(row.description).toBe('Custom admin copy')
    expect(row.freeShippingWhenThresholdMet).toBe(false)
  })

  it('ensures a missing CMS row is inserted once', () => {
    const seeded = ensureMarketSUntrackedLetterInShippingOptions(
      [{ id: 'standard-letter' }],
      () => ({ id: MARKET_S_UNTRACKED_LETTER_OPTION_ID, price: MARKET_S_UNTRACKED_LETTER_PRICE })
    )
    expect(seeded.map((o) => o.id)).toEqual([
      MARKET_S_UNTRACKED_LETTER_OPTION_ID,
      'standard-letter',
    ])
    expect(
      ensureMarketSUntrackedLetterInShippingOptions(seeded, () => ({
        id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
      }))
    ).toHaveLength(2)
  })

  it('builds server pricing option from CMS', () => {
    const priced = resolveMarketSUntrackedLetterPricingOption(
      { id: MARKET_S_UNTRACKED_LETTER_OPTION_ID, price: 3.95 },
      true
    )
    expect(priced.price).toBe(3.95)
    expect(priced.freeShippingWhenThresholdMet).toBe(true)
  })
})
