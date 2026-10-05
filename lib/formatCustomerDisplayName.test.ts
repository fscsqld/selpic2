import { describe, expect, it } from 'vitest'
import {
  formatCustomerDisplayName,
  resolveOrderCustomerGreetingName,
} from './formatCustomerDisplayName'

describe('formatCustomerDisplayName', () => {
  it('title-cases ALL CAPS and mixed case names', () => {
    expect(formatCustomerDisplayName('EMMA kim')).toBe('Emma Kim')
    expect(formatCustomerDisplayName('emma KIM')).toBe('Emma Kim')
    expect(formatCustomerDisplayName('Emma Kim')).toBe('Emma Kim')
  })

  it('handles hyphens and apostrophes', () => {
    expect(formatCustomerDisplayName("mary-jane o'brien")).toBe("Mary-Jane O'Brien")
  })

  it('falls back when empty', () => {
    expect(formatCustomerDisplayName('')).toBe('Customer')
    expect(formatCustomerDisplayName(null)).toBe('Customer')
  })
})

describe('resolveOrderCustomerGreetingName', () => {
  it('prefers customer name over email local-part', () => {
    expect(
      resolveOrderCustomerGreetingName({ name: 'EMMA kim', email: 'emma@example.com' })
    ).toBe('Emma Kim')
  })

  it('uses email local-part when name missing', () => {
    expect(resolveOrderCustomerGreetingName({ email: 'emma.kim@example.com' })).toBe(
      'Emma Kim'
    )
  })
})
