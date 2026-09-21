import { describe, expect, it } from 'vitest'
import {
  BESPOKE_TYPE_E_ROLL,
  bespokePageSubtitle,
  displayBespokeRollType,
  fontButtonSecondaryLine,
  isTypeERoll,
} from './bespokeCustomerCopy'

describe('displayBespokeRollType', () => {
  it('corrects Iron-onl on Type E without changing other rolls', () => {
    expect(displayBespokeRollType('Type E (Slim White Iron-onl)')).toBe(BESPOKE_TYPE_E_ROLL)
    expect(displayBespokeRollType('Type A (Hologram)')).toBe('Type A (Hologram)')
  })
})

describe('isTypeERoll', () => {
  it('treats legacy and corrected Type E as the same roll', () => {
    expect(isTypeERoll('Type E (Slim White Iron-onl)')).toBe(true)
    expect(isTypeERoll(BESPOKE_TYPE_E_ROLL)).toBe(true)
    expect(isTypeERoll('Type D (Crystal Clear)')).toBe(false)
    expect(isTypeERoll(null)).toBe(false)
  })
})

describe('fontButtonSecondaryLine', () => {
  it('hides a second line when it repeats Font N', () => {
    expect(fontButtonSecondaryLine('Font 1', 'Font 1')).toBeNull()
  })

  it('keeps a distinct secondary name', () => {
    expect(fontButtonSecondaryLine('Font 1', 'Andika')).toBe('Andika')
  })
})

describe('bespokePageSubtitle', () => {
  it('does not advertise zero ready-made products', () => {
    expect(bespokePageSubtitle(null, 0, 'Personalized designs')).toBe(
      'The Ultimate Tailor-Made Sticker Experience.'
    )
  })

  it('mentions ready-made products only when the catalog has some', () => {
    expect(bespokePageSubtitle(null, 3, 'Personalized designs')).toContain('3 ready-made products')
  })
})
