import { describe, expect, it } from 'vitest'
import {
  homeHeroCoverObjectPosition,
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

describe('homeHeroCoverObjectPosition', () => {
  it('pins charcoal slides left so the wall stays on portrait phones', () => {
    expect(homeHeroCoverObjectPosition({ id: 'hero-3' })).toBe('left')
  })

  it('keeps white-center slides on center crop', () => {
    expect(homeHeroCoverObjectPosition({ id: 'hero-1' })).toBe('center')
    expect(homeHeroCoverObjectPosition({ id: 'hero-2' })).toBe('center')
  })
})
