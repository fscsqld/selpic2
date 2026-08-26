import { describe, expect, it } from 'vitest'
import {
  detectFuelRetailer,
  extractFuelDescriptionLabel,
} from '@/lib/classification/australian-fuel-retailers'

describe('australian-fuel-retailers', () => {
  it('detects 7-Eleven fuel purchases', () => {
    const match = detectFuelRetailer('EFTPOS 08/04 7-ELEVEN MT GRAVATT EAST')
    expect(match?.category).toBe('EXPENSE_FUEL_TRAVEL')
    expect(match?.brand).toBe('7-Eleven')
  })

  it('detects compact 7ELEVEN spelling', () => {
    expect(detectFuelRetailer('V8656 7ELEVEN BRISBANE')?.brand).toBe('7-Eleven')
  })

  it('detects other AU fuel brands', () => {
    expect(detectFuelRetailer('AMPOL FOODARY CAIRNS')?.brand).toBe('Ampol')
    expect(detectFuelRetailer('LIBERTY OIL IPSWICH')?.brand).toBe('Liberty')
    expect(detectFuelRetailer('UNITED PETROLEUM')?.brand).toBe('United')
  })

  it('infers 7-Eleven from truncated Gravatt East location', () => {
    const match = detectFuelRetailer('Gravatt East)')
    expect(match?.category).toBe('EXPENSE_FUEL_TRAVEL')
    expect(match?.brand).toBe('7-Eleven')
  })

  it('preserves fuel label during NAB description cleanup', () => {
    const label = extractFuelDescriptionLabel('EFTPOS 08/04 7-ELEVEN MT GRAVATT EAST')
    expect(label).toContain('7-Eleven')
  })
})
