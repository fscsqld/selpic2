import { describe, expect, it } from 'vitest'
import {
  homepageCategoryCardEmoji,
  homepageCategoryCardTags,
  newParentCategoryChrome,
  shouldShowHomepageCategoryProductCount,
} from './homepageCategoryCard'

describe('homepageCategoryCardEmoji', () => {
  it('hides empty and whitespace-only emoji', () => {
    expect(homepageCategoryCardEmoji('')).toBe('')
    expect(homepageCategoryCardEmoji('   ')).toBe('')
    expect(homepageCategoryCardEmoji(undefined)).toBe('')
  })

  it('keeps a real leftover emoji in stored JSON', () => {
    expect(homepageCategoryCardEmoji('📱')).toBe('📱')
  })
})

describe('newParentCategoryChrome', () => {
  it('does not seed Add Category with emoji or New/Custom tags', () => {
    expect(newParentCategoryChrome()).toEqual({ emoji: '', tags: [] })
  })
})

describe('homepageCategoryCardTags', () => {
  it('drops empty and whitespace tags', () => {
    expect(homepageCategoryCardTags(['New', '  ', ''])).toEqual(['New'])
    expect(homepageCategoryCardTags(undefined)).toEqual([])
  })
})

describe('shouldShowHomepageCategoryProductCount', () => {
  it('hides zero and negative counts', () => {
    expect(shouldShowHomepageCategoryProductCount('Stickers', 0)).toBe(false)
    expect(shouldShowHomepageCategoryProductCount('Market S', 0)).toBe(false)
    expect(shouldShowHomepageCategoryProductCount('Stickers', -1)).toBe(false)
  })

  it('shows positive SKU counts on shopping tiles', () => {
    expect(shouldShowHomepageCategoryProductCount('Stickers', 27)).toBe(true)
    expect(shouldShowHomepageCategoryProductCount('Market S', 5)).toBe(true)
  })

  it('never shows a count on Custom Design or SELPIC N', () => {
    expect(shouldShowHomepageCategoryProductCount('Custom Design', 12)).toBe(false)
    expect(shouldShowHomepageCategoryProductCount('SELPIC N', 3)).toBe(false)
  })
})
