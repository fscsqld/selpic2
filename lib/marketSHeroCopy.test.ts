import { describe, expect, it } from 'vitest'
import { resolveCategoryHubHeroCopy, resolveMarketSHeroCopy } from './marketSHeroCopy'

describe('resolveMarketSHeroCopy', () => {
  it('uses slide title and subtitle when set', () => {
    expect(
      resolveMarketSHeroCopy({
        slideTitle: 'Market S: Pure K-Beauty & Family Gifts',
        slideSubtitle: 'From Everyday Home Spa Relief to Personalized Care for Mums & Kids.',
        categoryTitle: 'Market S',
        categoryDescription: 'K-Beauty & Family Gifts',
      })
    ).toEqual({
      title: 'Market S: Pure K-Beauty & Family Gifts',
      subtitle: 'From Everyday Home Spa Relief to Personalized Care for Mums & Kids.',
    })
  })

  it('falls back to category copy when slide title/subtitle are empty', () => {
    expect(
      resolveMarketSHeroCopy({
        slideTitle: '  ',
        slideSubtitle: '',
        categoryTitle: 'Market S',
        categoryDescription: 'K-Beauty & Family Gifts',
      })
    ).toEqual({
      title: 'Market S',
      subtitle: 'K-Beauty & Family Gifts',
    })
  })

  it('never returns an empty H1', () => {
    expect(
      resolveMarketSHeroCopy({
        slideTitle: null,
        slideSubtitle: null,
        categoryTitle: '',
        categoryDescription: '',
      })
    ).toEqual({
      title: 'Market S',
      subtitle: '',
    })
  })
})

describe('resolveCategoryHubHeroCopy', () => {
  it('uses Stickers slide copy when set (same charcoal hub as Market S)', () => {
    expect(
      resolveCategoryHubHeroCopy({
        slideTitle: 'Bright Names for Bright Days',
        slideSubtitle: 'Durable, 100% waterproof custom stickers for school, daycare & everyday fun.',
        categoryTitle: 'Stickers',
        categoryDescription: 'Express yourself with our premium sticker collection',
        fallbackTitle: 'Stickers',
      })
    ).toEqual({
      title: 'Bright Names for Bright Days',
      subtitle: 'Durable, 100% waterproof custom stickers for school, daycare & everyday fun.',
    })
  })

  it('falls back to the hub name when slide title is empty', () => {
    expect(
      resolveCategoryHubHeroCopy({
        slideTitle: '  ',
        slideSubtitle: '',
        categoryTitle: '',
        categoryDescription: '',
        fallbackTitle: 'Stickers',
      })
    ).toEqual({
      title: 'Stickers',
      subtitle: '',
    })
  })
})
