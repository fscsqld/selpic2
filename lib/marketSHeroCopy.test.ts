import { describe, expect, it } from 'vitest'
import { resolveMarketSHeroCopy } from './marketSHeroCopy'

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
