import { describe, expect, it } from 'vitest'
import {
  chargeableWeightGrams,
  packagingCubicWeightGrams,
  PACKAGING_PRESETS,
  resolvePackagingPreset,
  summarizePackagingCharge,
} from './packagingPresets'

describe('packagingPresets', () => {
  it('computes cubic weight for warehouse boxes (×250)', () => {
    // 220×160×77 mm → ~678 g
    expect(packagingCubicWeightGrams(PACKAGING_PRESETS['box-220x160x77'])).toBe(678)
    // 310×220×75 mm → ~1279 g
    expect(packagingCubicWeightGrams(PACKAGING_PRESETS['box-310x220x75'])).toBe(1279)
  })

  it('chargeable weight is max(physical, cubic)', () => {
    const box = PACKAGING_PRESETS['box-310x220x75']
    expect(chargeableWeightGrams(400, box)).toBe(1279)
    expect(chargeableWeightGrams(1500, box)).toBe(1500)
  })

  it('picks large envelope for letter services', () => {
    const p = resolvePackagingPreset({
      letterService: true,
      physicalGrams: 40,
      items: [{ category: 'HotGoods', subcategory: 'Single Item', isHotGoods: true, quantity: 1 }],
    })
    expect(p.id).toBe('envelope-240x280')
  })

  it('picks small envelope for sticker-only light letters', () => {
    const p = resolvePackagingPreset({
      letterService: true,
      physicalGrams: 40,
      items: [{ category: 'Stickers', quantity: 2 }],
    })
    expect(p.id).toBe('envelope-160x240')
  })

  it('picks 8-pack box for heavy Family Bundle / 8-pack name', () => {
    expect(
      resolvePackagingPreset({
        letterService: false,
        physicalGrams: 300,
        items: [
          {
            category: 'HotGoods',
            subcategory: 'Family Bundle',
            isHotGoods: true,
            name: 'DermaFix 8 Pack',
            shippingWeightGrams: 300,
            quantity: 1,
            price: 45,
          },
        ],
      }).id
    ).toBe('box-310x220x75')
  })

  it('picks Env 240×280 for website 1+1 tracked (not gift box)', () => {
    expect(
      resolvePackagingPreset({
        letterService: false,
        physicalGrams: 60,
        platformSource: 'website',
        items: [
          {
            category: 'HotGoods',
            subcategory: 'Family Bundle',
            isHotGoods: true,
            name: 'DermaFix 1+1',
            shippingWeightGrams: 60,
            quantity: 1,
            price: 22,
          },
        ],
      }).id
    ).toBe('envelope-240x280')
  })

  it('picks gift Box S for Etsy / marketplace (not website 1+1 envelope)', () => {
    expect(
      resolvePackagingPreset({
        letterService: false,
        physicalGrams: 60,
        platformSource: 'etsy',
        items: [
          {
            category: 'HotGoods',
            subcategory: 'Family Bundle',
            isHotGoods: true,
            name: 'DermaFix 1+1',
            shippingWeightGrams: 60,
            quantity: 1,
            price: 22,
          },
        ],
      }).id
    ).toBe('box-220x160x77')
  })

  it('still uses Box L for Etsy 8-pack (size over gift box)', () => {
    expect(
      resolvePackagingPreset({
        letterService: false,
        physicalGrams: 300,
        platformSource: 'etsy',
        items: [
          {
            category: 'HotGoods',
            subcategory: 'Family Bundle',
            isHotGoods: true,
            name: 'DermaFix 8 Pack',
            shippingWeightGrams: 300,
            quantity: 1,
            price: 45,
          },
        ],
      }).id
    ).toBe('box-310x220x75')
  })

  it('summarize includes AusPost band for cubic-driven 8-pack box', () => {
    const s = summarizePackagingCharge(400, PACKAGING_PRESETS['box-310x220x75'])
    expect(s.chargeableGrams).toBe(1279)
    expect(s.ausPostBandHint).toMatch(/over 1 kg up to 3 kg/i)
  })
})
