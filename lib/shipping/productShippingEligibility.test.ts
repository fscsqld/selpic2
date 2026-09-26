import { describe, expect, it } from 'vitest'
import {
  getCartShippingRequirement,
  isShippingOptionCompatible,
  mergeShippingOptionsForCart,
  MIXED_LETTER_MAX_STICKER_SHEETS,
} from './productShippingEligibility'
import {
  MARKET_S_UNTRACKED_LETTER_OPTION_ID,
  MARKET_S_UNTRACKED_LETTER_PRICE,
} from './marketSLetterOption'

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
const stamp = { category: 'Stamps' }
const sunscreen = { category: 'HotGoods', subcategory: 'Sunscreen', isHotGoods: true }

describe('Market S shipping dual-rate', () => {
  it('allows untracked letter for 1–3 mask singles packed at or under 20 mm', () => {
    const req = getCartShippingRequirement([{ product: maskSingle, quantity: 3 }])
    expect(req.allowUntrackedMaskLetter).toBe(true)
    expect(req.requiresParcel).toBe(false)
    expect(req.maskSingleQuantity).toBe(3)
    expect(req.stickerSheetQuantity).toBe(0)
    expect(req.packedThicknessMm).toBe(15)

    const options = mergeShippingOptionsForCart([letter, trackedLetter, parcel, pickup], req)
    expect(options.map((option) => option.id)).toEqual([
      MARKET_S_UNTRACKED_LETTER_OPTION_ID,
      'parcel-post',
      'click-collect-mansfield',
    ])
    const synthetic = options[0] as {
      alwaysFree?: boolean
      freeShippingWhenThresholdMet?: boolean
      price: number
    }
    expect(synthetic.alwaysFree).toBe(false)
    expect(synthetic.freeShippingWhenThresholdMet).toBe(true)
    expect(synthetic.price).toBe(MARKET_S_UNTRACKED_LETTER_PRICE)
    expect(isShippingOptionCompatible(letter, req)).toBe(false)
  })

  it('allows untracked letter when Market S singles mix with up to 3 sticker sheets', () => {
    const req = getCartShippingRequirement([
      { product: maskSingle, quantity: 1 },
      { product: sticker, quantity: MIXED_LETTER_MAX_STICKER_SHEETS },
    ])
    expect(req.allowUntrackedMaskLetter).toBe(true)
    expect(req.requiresParcel).toBe(false)
    expect(req.stickerSheetQuantity).toBe(3)
    expect(req.packedThicknessMm).toBe(5 + 3) // 1 mask + 3 sheets @ 1 mm
  })

  it('forces parcel when sticker sheets exceed the mixed-letter cap', () => {
    const req = getCartShippingRequirement([
      { product: maskSingle, quantity: 1 },
      { product: sticker, quantity: MIXED_LETTER_MAX_STICKER_SHEETS + 1 },
    ])
    expect(req.allowUntrackedMaskLetter).toBe(false)
    expect(req.requiresParcel).toBe(true)
  })

  it('forces parcel for stamps + Market S (non-sticker letter goods)', () => {
    const req = getCartShippingRequirement([
      { product: maskSingle, quantity: 1 },
      { product: stamp, quantity: 1 },
    ])
    expect(req.allowUntrackedMaskLetter).toBe(false)
    expect(req.requiresParcel).toBe(true)
  })

  it('forces parcel for 4+ singles, Family Bundle, mixed stickers over cap, and thick packs', () => {
    expect(getCartShippingRequirement([{ product: maskSingle, quantity: 4 }]).requiresParcel).toBe(
      true
    )
    expect(
      getCartShippingRequirement([{ product: familyBundle, quantity: 1 }]).requiresParcel
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

  it('uses Admin CMS price for Market S letter when the CMS row is present', () => {
    const req = getCartShippingRequirement([{ product: maskSingle, quantity: 1 }])
    const cmsRow = {
      id: MARKET_S_UNTRACKED_LETTER_OPTION_ID,
      name: 'Untracked letter (Market S singles)',
      price: 4.2,
      type: 'delivery' as const,
    }
    const options = mergeShippingOptionsForCart([cmsRow, parcel, pickup], req, {
      marketSLetterFreeWhenThresholdMet: true,
    })
    expect(options[0]?.id).toBe(MARKET_S_UNTRACKED_LETTER_OPTION_ID)
    expect((options[0] as { price: number }).price).toBe(4.2)
  })

  it('honours Admin toggle for Market S letter free-at-threshold on the synthetic row', () => {
    const req = getCartShippingRequirement([{ product: maskSingle, quantity: 1 }])
    const on = mergeShippingOptionsForCart([parcel, pickup], req, {
      marketSLetterFreeWhenThresholdMet: true,
    })
    const off = mergeShippingOptionsForCart([parcel, pickup], req, {
      marketSLetterFreeWhenThresholdMet: false,
    })
    expect((on[0] as { freeShippingWhenThresholdMet?: boolean }).freeShippingWhenThresholdMet).toBe(
      true
    )
    expect(
      (off[0] as { freeShippingWhenThresholdMet?: boolean }).freeShippingWhenThresholdMet
    ).toBe(false)
  })

  it('always keeps Click & Collect available', () => {
    for (const lines of [
      [{ product: sticker, quantity: 1 }],
      [{ product: maskSingle, quantity: 2 }],
      [{ product: familyBundle, quantity: 1 }],
      [
        { product: maskSingle, quantity: 1 },
        { product: sticker, quantity: 2 },
      ],
    ]) {
      const req = getCartShippingRequirement(lines)
      const options = mergeShippingOptionsForCart([letter, parcel, pickup], req)
      expect(options.some((o) => o.id === 'click-collect-mansfield')).toBe(true)
    }
  })
})
