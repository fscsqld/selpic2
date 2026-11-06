import { describe, expect, it } from 'vitest'
import { getShippingCarrierRecommendation } from './shippingCarrierRecommend'

const base = {
  shippingOptionId: 'parcel-post',
  shippingOptionName: 'Parcel Post (Goods)',
  shippingPrice: 11.7,
  shippingTrackingIncluded: true,
  shippingType: 'delivery' as const,
  address: {
    streetAddress: '10 Queen St',
    suburb: 'Brisbane',
    state: 'QLD',
    postcode: '4000',
    asSingleLine: '',
  },
  items: [
    {
      category: 'HotGoods',
      subcategory: 'Family Bundle',
      isHotGoods: true,
      quantity: 1,
      shippingWeightGrams: 280,
      price: 29,
      name: 'DermaFix 8 Pack Masks',
    },
  ],
}

describe('getShippingCarrierRecommendation', () => {
  it('recommends AusPost letter for Market S untracked with envelope preset', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      shippingOptionId: 'market-s-untracked-letter',
      shippingOptionName: 'Untracked letter (Market S singles)',
      shippingTrackingIncluded: false,
      items: [
        {
          category: 'HotGoods',
          subcategory: 'Single Item',
          isHotGoods: true,
          quantity: 1,
          price: 8,
          name: 'DermaFix Single',
        },
      ],
    })
    expect(r.key).toBe('auspost_untracked')
    expect(r.packaging?.preset.id).toBe('envelope-240x280')
    expect(r.reason).toMatch(/Pack:/)
  })

  it('uses chargeable cubic weight for 8-pack metro Transdirect tip', () => {
    const r = getShippingCarrierRecommendation(base)
    expect(r.key).toBe('transdirect_metro')
    expect(r.packaging?.preset.id).toBe('box-310x220x75')
    expect(r.estimatedWeightGrams).toBe(280)
    expect(r.chargeableWeightGrams).toBe(1279)
    expect(r.reason).toMatch(/chargeable ~1279/i)
    expect(r.reason).toMatch(/≥1 kg/i)
  })

  it('picks Env 240×280 for website 1+1 tracked', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      platformSource: 'website',
      items: [
        {
          category: 'HotGoods',
          subcategory: 'Family Bundle',
          isHotGoods: true,
          quantity: 1,
          shippingWeightGrams: 60,
          price: 22,
          name: 'DermaFix 1+1',
        },
      ],
    })
    expect(r.packaging?.preset.id).toBe('envelope-240x280')
    expect(r.packaging?.fitsLargeLetter).toBe(true)
  })

  it('picks gift Box S for Etsy marketplace orders', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      platformSource: 'etsy',
      items: [
        {
          category: 'HotGoods',
          subcategory: 'Family Bundle',
          isHotGoods: true,
          quantity: 1,
          shippingWeightGrams: 60,
          price: 22,
          name: 'DermaFix 1+1',
        },
      ],
    })
    expect(r.packaging?.preset.id).toBe('box-220x160x77')
    expect(r.chargeableWeightGrams).toBe(678)
  })

  it('forces AusPost when address is a PO Box', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      address: {
        ...base.address,
        streetAddress: 'PO Box 55',
        asSingleLine: 'PO Box 55 Brisbane QLD 4000',
      },
    })
    expect(r.key).toBe('auspost_po_box')
    expect(r.packaging?.preset.kind).toBe('box')
  })

  it('recommends AusPost for TAS / remote tracked parcels', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      address: {
        streetAddress: '1 Harbour Rd',
        suburb: 'Hobart',
        state: 'TAS',
        postcode: '7000',
        asSingleLine: '',
      },
    })
    expect(r.key).toBe('auspost_remote')
  })

  it('keeps Click & Collect as pickup without packaging', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      shippingOptionId: 'local-pickup',
      shippingOptionName: 'Click & Collect (Mansfield)',
      shippingTrackingIncluded: false,
      shippingType: 'pickup',
    })
    expect(r.key).toBe('pickup')
    expect(r.packaging).toBeNull()
  })

  it('honours packagingPresetId override', () => {
    const r = getShippingCarrierRecommendation({
      ...base,
      platformSource: 'website',
      packagingPresetId: 'box-220x160x77',
    })
    expect(r.packaging?.preset.id).toBe('box-220x160x77')
    expect(r.chargeableWeightGrams).toBe(678)
  })
})
