import { describe, expect, it } from 'vitest'
import {
  AUSPOST_TRACKED_LETTER_MEDIUM_C5,
  CMS_EXPRESS_POST_DEFAULT_PRICE,
  migrateAusPostShippingOptionPrices,
} from './ausPostRetailRates'

describe('migrateAusPostShippingOptionPrices', () => {
  it('upgrades mislabelled tracked-letter $5.55 to Medium C5 $8.10', () => {
    const next = migrateAusPostShippingOptionPrices([
      { id: 'tracked-letter', price: 5.55 },
      { id: 'standard-letter', price: 3.7 },
    ])
    expect(next[0]?.price).toBe(AUSPOST_TRACKED_LETTER_MEDIUM_C5)
    expect(next[1]?.price).toBe(3.7)
  })

  it('upgrades legacy express $14.50 to ≤500 g $15.20', () => {
    const next = migrateAusPostShippingOptionPrices([{ id: 'express-post', price: 14.5 }])
    expect(next[0]?.price).toBe(CMS_EXPRESS_POST_DEFAULT_PRICE)
  })

  it('does not overwrite intentional Admin prices', () => {
    const next = migrateAusPostShippingOptionPrices([
      { id: 'tracked-letter', price: 9.5 },
      { id: 'express-post', price: 16 },
    ])
    expect(next[0]?.price).toBe(9.5)
    expect(next[1]?.price).toBe(16)
  })
})
