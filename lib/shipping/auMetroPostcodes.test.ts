import { describe, expect, it } from 'vitest'
import {
  addressLooksLikePoBoxOrLocker,
  isAuMetroPostcode,
  isAusPostPreferredRemotePostcode,
  parseAuPostcode,
} from './auMetroPostcodes'

describe('auMetroPostcodes', () => {
  it('parses 4-digit AU postcodes', () => {
    expect(parseAuPostcode('4122')).toBe(4122)
    expect(parseAuPostcode('QLD 3000')).toBe(3000)
    expect(parseAuPostcode('12')).toBeNull()
  })

  it('flags capital metros where Transdirect is often cheaper', () => {
    expect(isAuMetroPostcode('2000')).toBe(true)
    expect(isAuMetroPostcode('3000')).toBe(true)
    expect(isAuMetroPostcode('4122')).toBe(true)
    expect(isAuMetroPostcode('4217')).toBe(true)
    expect(isAuMetroPostcode('6000')).toBe(true)
  })

  it('flags remote / NT / TAS for AusPost preference', () => {
    expect(isAusPostPreferredRemotePostcode('7000')).toBe(true)
    expect(isAusPostPreferredRemotePostcode('0870')).toBe(true)
    expect(isAusPostPreferredRemotePostcode('6725')).toBe(true)
    expect(isAusPostPreferredRemotePostcode('4122')).toBe(false)
  })

  it('detects PO Box and parcel locker lines', () => {
    expect(addressLooksLikePoBoxOrLocker('PO Box 123')).toBe(true)
    expect(addressLooksLikePoBoxOrLocker('Parcel Locker 9988 12345')).toBe(true)
    expect(addressLooksLikePoBoxOrLocker('12 Sample St')).toBe(false)
  })
})
