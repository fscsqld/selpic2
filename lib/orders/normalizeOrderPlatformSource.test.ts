import { describe, expect, it } from 'vitest'
import {
  normalizeOrderPlatformSource,
  paymentFieldsForPlatform,
} from './normalizeOrderPlatformSource'

describe('normalizeOrderPlatformSource', () => {
  it('accepts known channels case-insensitively', () => {
    expect(normalizeOrderPlatformSource('eBay')).toBe('ebay')
    expect(normalizeOrderPlatformSource('AMAZON')).toBe('amazon')
    expect(normalizeOrderPlatformSource('etsy')).toBe('etsy')
    expect(normalizeOrderPlatformSource('website')).toBe('website')
  })

  it('falls back for empty or unknown values', () => {
    expect(normalizeOrderPlatformSource('')).toBe('website')
    expect(normalizeOrderPlatformSource('shopify')).toBe('website')
    expect(normalizeOrderPlatformSource(null, 'ebay')).toBe('ebay')
  })
})

describe('paymentFieldsForPlatform', () => {
  it('uses marketplace payment for non-website channels', () => {
    expect(paymentFieldsForPlatform('ebay')).toEqual({
      paymentMethod: 'marketplace',
      paymentMethodName: 'eBay',
    })
    expect(paymentFieldsForPlatform('website').paymentMethod).toBe('bank')
  })
})
