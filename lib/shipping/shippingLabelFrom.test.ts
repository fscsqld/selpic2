import { describe, expect, it } from 'vitest'
import {
  COMPANY_SHIPPING_LABEL_FROM,
  formatShippingLabelFromOverride,
  parseShippingLabelFromOverride,
  resolveShippingLabelFromPrint,
  validateShippingLabelFromOverrideInput,
} from './shippingLabelFrom'

describe('shippingLabelFrom', () => {
  it('defaults to company FROM when override missing', () => {
    expect(resolveShippingLabelFromPrint({}).name).toBe(COMPANY_SHIPPING_LABEL_FROM.name)
    expect(resolveShippingLabelFromPrint({ shippingLabelFromOverride: null }).addressLine1).toBe(
      COMPANY_SHIPPING_LABEL_FROM.addressLine1
    )
  })

  it('rejects incomplete factory FROM', () => {
    const bad = validateShippingLabelFromOverrideInput({
      name: 'Factory',
      streetAddress: '',
      suburb: 'Brisbane',
      state: 'QLD',
      postcode: '4000',
    })
    expect(bad.ok).toBe(false)
  })

  it('accepts and formats a factory FROM', () => {
    const ok = validateShippingLabelFromOverrideInput({
      name: 'Factory Co',
      streetAddress: '12 Industrial Rd',
      suburb: 'Darra',
      state: 'QLD',
      postcode: '4076',
      country: 'Australia',
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const print = formatShippingLabelFromOverride(ok.value)
    expect(print.name).toBe('Factory Co')
    expect(print.addressLine1).toMatch(/Industrial/)
    expect(print.addressLine2).toMatch(/Darra/)
  })

  it('resolves override on the order snapshot', () => {
    const parsed = parseShippingLabelFromOverride({
      name: 'X',
      streetAddress: '1 St',
      suburb: 'A',
      state: 'QLD',
      postcode: '4000',
    })
    expect(parsed).toBeTruthy()
    expect(resolveShippingLabelFromPrint({ shippingLabelFromOverride: parsed }).name).toBe('X')
  })
})
