import { describe, expect, it } from 'vitest'
import { formatCurrency, roundMoney } from '@/lib/utils/currency-format'

describe('formatCurrency signed zero', () => {
  it('does not show $-0.00 for IEEE -0 (March recon Difference)', () => {
    expect(formatCurrency(-0)).toBe('$0.00')
    expect(formatCurrency(Object.is(795.62 - 795.62, -0) ? -0 : 0)).toBe('$0.00')
    expect(roundMoney(-0)).toBe(0)
    expect(Object.is(roundMoney(-0.001), -0)).toBe(false)
  })
})
