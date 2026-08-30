import { describe, expect, it } from 'vitest'
import {
  atoCentsLeftOut,
  expectedAtoBasCashFromLedgerNet,
  roundAtoWholeDollars,
} from '@/lib/utils/ato-lodgment-rounding'

describe('ATO lodgment whole-dollar rounding (leave cents out)', () => {
  it('truncates cents and never rounds up (ATO BAS / tax return rule)', () => {
    expect(roundAtoWholeDollars(18.45)).toBe(18)
    expect(roundAtoWholeDollars(18.99)).toBe(18)
    expect(roundAtoWholeDollars(765.48)).toBe(765)
    expect(roundAtoWholeDollars(100)).toBe(100)
    expect(roundAtoWholeDollars(-1674.16)).toBe(-1674)
  })

  it('is not nearest-dollar (50c does not round up)', () => {
    expect(roundAtoWholeDollars(18.5)).toBe(18)
    expect(roundAtoWholeDollars(18.6)).toBe(18)
    expect(Math.round(18.5)).toBe(19)
  })

  it('measures cents left out vs expected ATO banked refund', () => {
    expect(atoCentsLeftOut(18.45)).toBeCloseTo(0.45, 2)
    expect(expectedAtoBasCashFromLedgerNet(18.45)).toBe(18)
    expect(expectedAtoBasCashFromLedgerNet(-765.48)).toBe(-765)
  })
})
