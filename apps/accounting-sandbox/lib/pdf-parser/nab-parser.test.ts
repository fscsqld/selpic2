import { describe, expect, it } from 'vitest'
import { isBankAdvisoryNotice } from '@/lib/classification/bank-advisory'

describe('NABParser advisory line handling', () => {
  it('detects interest rate notice lines that are not real transactions', () => {
    expect(
      isBankAdvisoryNotice('5 May 26 PLEASE NOTE FROM TODAY YOUR DR INTEREST RATE IS 15.410%')
    ).toBe(true)
    expect(isBankAdvisoryNotice('Please Note From Today Your')).toBe(true)
  })
})
