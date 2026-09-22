import { describe, expect, it } from 'vitest'
import {
  getCartShippingRequirement,
  isShippingOptionCompatible,
  mergeShippingOptionsForCart,
} from './productShippingEligibility'
import { MARKET_S_UNTRACKED_LETTER_OPTION_ID } from './marketSLetterOption'

const letter = { id: 'standard-letter', name: 'Standard Letter', type: 'delivery' as const }
const trackedLetter = { id: 'tracked-letter', name: 'Tracked Letter', type: 'delivery' as const }
const parcel = { id: 'parcel-post', name: 'Parcel Post (Goods)', type: 'delivery' as const }
const pickup = { id: 'click-collect-mansfield', name: 'Click & Collect', type: 'pickup' as const }

const maskSingle = {
  category: 'HotGoods',
  subcategory: 'Single Item',
  isHotGoods: true,
}

const familyBundle = {
  category: 'HotGoods',
  subcategory: 'Family Bundle',
  isHotGoods: true,
}

const sticker = { category: 'Stickers' }
const sunscreen = { category: 'HotGoods', subcategory: 'Sunscreen', isHotGoods: true }

describe('Market S shipping dual-rate', () => {
  it('allows untracked $3.20 letter for 1–3 mask singles packed at or under 20 mm', () => {
    const req = getCartShippingRequirement([{ product: maskSingle, quantity: 3 }])
    expect(req.allowUntrackedMaskLetter).toBe(true)
    expect(req.requiresParcel).toBe(false)
    expect(req.maskSingleQuantity).toBe(3)
    expect(req.packedThicknessMm).toBe(15)

    const options = mergeShippingOptionsForCart([letter, trackedLetter, parcel, pickup], req)
    expect(options.map((option) => option.id)).toEqual([
      MARKET_S_UNTRACKED_LETTER_OPTION_ID,
      'parcel-post',
      'click-collect-mansfield',
    ])
    expect(isShippingOptionCompatible(letter, req)).toBe(false)
  })

  it('forces parcel for 4+ singles, Family Bundle, mixed stickers, and thick packs', () => {
    expect(getCartShippingRequirement([{ product: maskSingle, quantity: 4 }]).requiresParcel).toBe(
      true
    )
    expect(
      getCartShippingRequirement([{ product: familyBundle, quantity: 1 }]).requiresParcel
    ).toBe(true)
    expect(
      getCartShippingRequirement([
        { product: maskSingle, quantity: 1 },
        { product: sticker, quantity: 1 },
      ]).requiresParcel
    ).toBe(true)
    expect(
      getCartShippingRequirement([
        {
          product: { ...maskSingle, shippingThicknessMm: 8 },
          quantity: 3,
        },
      ]).requiresParcel
    ).toBe(true)
    expect(
      getCartShippingRequirement([
        { product: { ...maskSingle, shippingWeightGrams: 200 }, quantity: 3 },
      ]).requiresParcel
    ).toBe(true)
    expect(
      getCartShippingRequirement([{ product: sunscreen, quantity: 1 }]).requiresParcel
    ).toBe(true)
  })

  it('keeps sticker-only carts on CMS letter and hides the Market S synthetic rate', () => {
    const req = getCartShippingRequirement([{ product: sticker, quantity: 2 }])
    expect(req.allowUntrackedMaskLetter).toBe(false)
    expect(req.requiresParcel).toBe(false)
    const options = mergeShippingOptionsForCart([letter, parcel, pickup], req)
    expect(options.map((option) => option.id)).toEqual([
      'standard-letter',
      'parcel-post',
      'click-collect-mansfield',
    ])
  })
})
