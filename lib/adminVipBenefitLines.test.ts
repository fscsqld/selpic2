import { describe, expect, it } from 'vitest'
import { adminVipBenefitLines } from './adminVipBenefitLines'

describe('adminVipBenefitLines', () => {
  it('ignores Hangul CMS config benefits and uses English fallback', () => {
    const lines = adminVipBenefitLines({
      gradeCode: 1,
      configBenefits: ['5% 상시 할인', '최대 할인 $10,000', '생일 쿠폰'],
    })
    expect(lines.some((l) => /[\uAC00-\uD7A3]/.test(l))).toBe(false)
    expect(lines[0]).toMatch(/5%/)
  })

  it('prefers structured benefit row in English', () => {
    const lines = adminVipBenefitLines({
      gradeCode: 1,
      configBenefits: ['5% 상시 할인'],
      benefitRow: {
        baseDiscountPercentage: 5,
        freeShipping: false,
        maxDiscountAmount: 10000,
        additionalBenefits: ['Birthday coupon'],
        isActive: true,
      },
    })
    expect(lines).toContain('5% ongoing discount')
    expect(lines).toContain('Max discount $10,000')
    expect(lines).toContain('Birthday coupon')
  })
})
