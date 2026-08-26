import { describe, expect, it } from 'vitest'
import {
  detectShippingProvider,
  extractShippingDescriptionLabel,
} from '@/lib/classification/australian-shipping-providers'

describe('australian-shipping-providers', () => {
  it('detects Hanaone Express', () => {
    const match = detectShippingProvider('Hanaone Express Z5284156011')
    expect(match?.category).toBe('EXPENSE_FREIGHT_SHIPPING')
    expect(match?.brand).toBe('Hanaone Express')
  })

  it('detects Australia Post customer mail', () => {
    expect(detectShippingProvider('AUSTRALIA POST PARCEL POST BRISBANE')?.brand).toBe(
      'Australia Post'
    )
    expect(detectShippingProvider('AUSPOST MYPOST BUSINESS')?.brand).toBe('Australia Post')
  })

  it('detects other AU couriers', () => {
    expect(detectShippingProvider('SENDLE PTY LTD')?.brand).toBe('Sendle')
    expect(detectShippingProvider('TNT EXPRESS MELBOURNE')?.brand).toBe('TNT')
    expect(detectShippingProvider('STARTRACK SYDNEY')?.brand).toBe('Australia Post')
  })

  it('preserves shipping label in NAB cleanup', () => {
    expect(extractShippingDescriptionLabel('Hanaone Express Z5284156011')).toBe('Hanaone Express')
  })
})
