import { describe, expect, it } from 'vitest'
import { charcoalBannerTitleOneLine } from './charcoalHeroTitle'

describe('charcoalBannerTitleOneLine', () => {
  it('keeps the live Stickers hub title eligible for one line from sm up', () => {
    expect(charcoalBannerTitleOneLine('Bright Names for Bright Days')).toBe(true)
  })

  it('lets the longer Market S hub title wrap', () => {
    expect(
      charcoalBannerTitleOneLine('Market S: Pure K-Beauty & Family Gifts')
    ).toBe(false)
  })

  it('ignores blank titles', () => {
    expect(charcoalBannerTitleOneLine('   ')).toBe(false)
  })
})
