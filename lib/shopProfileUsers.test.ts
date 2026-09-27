import { describe, expect, it } from 'vitest'
import {
  isRegisteredWithinLastDays,
  isShopProfileSeedEmail,
  isShopProfileSeedUser,
  phoneForShopProfileOrderMatch,
} from './shopProfileUsers'

describe('shopProfileUsers', () => {
  it('detects seed emails and demo flag', () => {
    expect(isShopProfileSeedEmail('user@example.com')).toBe(true)
    expect(isShopProfileSeedEmail('INFO@selpic.com.au')).toBe(true)
    expect(isShopProfileSeedEmail('fscsqld@gmail.com')).toBe(false)
    expect(isShopProfileSeedUser({ email: 'a@b.com', isDemo: true })).toBe(true)
  })

  it('uses rolling last-N-days for New Users (not a fixed calendar date)', () => {
    const now = Date.parse('2026-09-27T00:00:00.000Z')
    expect(isRegisteredWithinLastDays('2026-09-25T00:00:00.000Z', 7, now)).toBe(true)
    expect(isRegisteredWithinLastDays('2026-04-24T00:00:00.000Z', 7, now)).toBe(false)
    expect(isRegisteredWithinLastDays('2026-09-28T00:00:00.000Z', 7, now)).toBe(false)
  })

  it('omits phone for seed profiles so shared Mansfield mobile cannot double-count', () => {
    expect(
      phoneForShopProfileOrderMatch({
        email: 'user@example.com',
        phone: '0466894279',
      })
    ).toBeUndefined()
    expect(
      phoneForShopProfileOrderMatch({
        email: 'fscsqld@gmail.com',
        phone: '0466894279',
      })
    ).toBe('0466894279')
  })
})
