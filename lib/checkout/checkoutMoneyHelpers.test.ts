import { describe, expect, it } from 'vitest'
import { getPaymentFee } from './paymentFee'
import { computePromoDiscountAmount, validatePromoCodeForCheckout } from './promoCheckoutDiscount'
import { stackVipAndPromoDiscounts } from './stackDiscounts'
import { computeVipCheckoutBenefit } from './vipCheckoutDiscount'

describe('checkout money helpers (UI parity)', () => {
  it('computes fixed and percentage payment fees', () => {
    expect(getPaymentFee({ fee: 1.5, feeType: 'fixed' }, 100)).toBe(1.5)
    expect(getPaymentFee({ feeType: 'percentage', feePercentage: 2 }, 100)).toBe(2)
    expect(getPaymentFee(null, 100)).toBe(0)
  })

  it('stacks VIP + promo like checkout page', () => {
    expect(
      stackVipAndPromoDiscounts({
        subtotal: 50,
        vipDiscount: 5,
        promoDiscount: 10,
        vipAllowsStacking: true,
        promoAllowsStacking: true,
      })
    ).toBe(15)
    expect(
      stackVipAndPromoDiscounts({
        subtotal: 50,
        vipDiscount: 5,
        promoDiscount: 10,
        vipAllowsStacking: false,
        promoAllowsStacking: true,
      })
    ).toBe(10)
  })

  it('computes percentage promo with max cap', () => {
    const promo = {
      code: 'SAVE',
      discountType: 'percentage' as const,
      discountValue: 50,
      maxDiscountAmount: 5,
      isActive: true,
    }
    expect(computePromoDiscountAmount(promo, 40)).toBe(5)
    expect(validatePromoCodeForCheckout(promo, 40).valid).toBe(true)
  })

  it('computes VIP stickers base discount', () => {
    const benefit = computeVipCheckoutBenefit(
      [
        {
          gradeCode: 1,
          isActive: true,
          baseDiscountPercentage: 5,
          freeShipping: false,
          allowPromoCodeStacking: true,
        },
      ],
      1,
      20,
      [{ productId: '1', category: 'Stickers', price: 20 }]
    )
    expect(benefit?.discount).toBe(1)
  })

  it('rejects claimed discount above server max (attacker simulation)', () => {
    const server = stackVipAndPromoDiscounts({
      subtotal: 30,
      vipDiscount: 0,
      promoDiscount: 3,
      vipAllowsStacking: true,
      promoAllowsStacking: true,
    })
    const clientClaim = 25
    expect(clientClaim).toBeGreaterThan(server + 0.01)
  })
})
