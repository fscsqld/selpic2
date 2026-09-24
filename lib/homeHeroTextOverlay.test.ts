import { describe, expect, it } from 'vitest'
import {
  homeHeroImageFit,
  isHomeHeroCharcoalLeft,
  resolveHomeHeroTextOverlay,
} from './homeHeroTextOverlay'

describe('resolveHomeHeroTextOverlay', () => {
  it('uses charcoal-left for live homepage slide hero-3 when the field is missing', () => {
    expect(resolveHomeHeroTextOverlay({ id: 'hero-3' })).toBe('charcoal-left')
  })

  it('keeps white-center for slides 1 and 2 when the field is missing', () => {
    expect(resolveHomeHeroTextOverlay({ id: 'hero-1' })).toBe('white-center')
    expect(resolveHomeHeroTextOverlay({ id: 'hero-2' })).toBe('white-center')
  })

  it('lets an explicit white-center override hero-3', () => {
    expect(
      resolveHomeHeroTextOverlay({ id: 'hero-3', textOverlay: 'white-center' })
    ).toBe('white-center')
  })

  it('lets any slide opt into charcoal-left', () => {
    expect(
      resolveHomeHeroTextOverlay({ id: 'hero-2', textOverlay: 'charcoal-left' })
    ).toBe('charcoal-left')
    expect(isHomeHeroCharcoalLeft({ id: 'hero-new', textOverlay: 'charcoal-left' })).toBe(
      true
    )
  })

  it('treats unknown overlay values as white-center', () => {
    expect(resolveHomeHeroTextOverlay({ id: 'hero-1', textOverlay: 'pink' })).toBe(
      'white-center'
    )
    expect(resolveHomeHeroTextOverlay({})).toBe('white-center')
  })
})

describe('homeHeroImageFit', () => {
  it('uses contain-mobile for charcoal slide 3 so phones show the whole family photo', () => {
    expect(homeHeroImageFit({ id: 'hero-3' })).toBe('contain-mobile')
  })

  it('keeps cover for white-center slides 1 and 2', () => {
    expect(homeHeroImageFit({ id: 'hero-1' })).toBe('cover')
    expect(homeHeroImageFit({ id: 'hero-2' })).toBe('cover')
  })

  it('does not contain-mobile when hero-3 is explicitly white-center', () => {
    expect(homeHeroImageFit({ id: 'hero-3', textOverlay: 'white-center' })).toBe('cover')
  })

  it('contain-mobile follows charcoal overlay, not only the hero-3 id', () => {
    expect(homeHeroImageFit({ id: 'hero-2', textOverlay: 'charcoal-left' })).toBe(
      'contain-mobile'
    )
  })
})
