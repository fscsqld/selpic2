import 'server-only'

import type { OrderRecord } from '@/lib/store'
import { getPaymentFee } from '@/lib/checkout/paymentFee'
import {
  computePromoDiscountAmount,
  findPromoByCode,
  validatePromoCodeForCheckout,
} from '@/lib/checkout/promoCheckoutDiscount'
import { stackVipAndPromoDiscounts } from '@/lib/checkout/stackDiscounts'
import { computeVipCheckoutBenefit } from '@/lib/checkout/vipCheckoutDiscount'
import { readCmsCheckoutPricingConfig } from '@/lib/server/cmsCheckoutPricingConfig'
import {
  countPromoUsageForEmail,
  resolveStorefrontVipGradeFromOrders,
} from '@/lib/server/resolveStorefrontVipGrade'

type OrderDraft = Omit<OrderRecord, 'id' | 'createdAtIso'>

function audCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100)
}

function cartLinesForDiscount(draft: OrderDraft) {
  return (draft.items || []).map((item) => ({
    productId: String(item.productId || ''),
    category: item.category,
    price: (Number(item.price) || 0) * Math.max(1, Math.floor(item.quantity || 1)),
  }))
}

/**
 * After catalog + shipping validation: trust session email’s VIP grade, recompute
 * payment fee + discounts from CMS (same math as checkout UI), overwrite money fields.
 * Rejects only when the client claimed a *higher* discount than the server allows (±1¢).
 */
export async function applyServerCheckoutMoney(args: {
  orderDraft: OrderDraft
  sessionEmail: string
  /** Prefer 'bank' | 'stripe' | draft.paymentMethod */
  paymentType?: string
}): Promise<OrderDraft> {
  const draft = args.orderDraft
  const subtotal = Number(draft.subtotal) || 0
  const shipping = Number(draft.shippingPrice) || 0
  const cms = await readCmsCheckoutPricingConfig()

  const { gradeCode, orders } = await resolveStorefrontVipGradeFromOrders({
    email: args.sessionEmail,
    phone: draft.customer?.phone,
    gradeConfigs: cms.vipGradeConfigs,
  })

  const lines = cartLinesForDiscount(draft)
  const promoCodeRaw = String(draft.promoCode || '').trim()
  const hasCmsVip = cms.vipGradeBenefits.length > 0
  const hasCmsPromo = cms.promoCodes.length > 0

  // If CMS pricing rows failed to load, do not false-reject live checkouts on discount.
  // Auth + email bind + catalog/shipping checks still apply.
  if (!hasCmsVip && !hasCmsPromo && !promoCodeRaw) {
    return {
      ...draft,
      vipGradeCode: gradeCode,
    }
  }

  const vip = hasCmsVip
    ? computeVipCheckoutBenefit(cms.vipGradeBenefits, gradeCode, subtotal, lines)
    : null
  const vipDiscount = vip?.discount || 0

  let promoDiscount = 0
  let promoAllowsStacking = true
  if (promoCodeRaw) {
    if (!hasCmsPromo) {
      throw new Error('Promo code could not be verified. Please refresh checkout and try again.')
    }
    const promo = findPromoByCode(cms.promoCodes, promoCodeRaw)
    const usage = countPromoUsageForEmail(orders, promoCodeRaw, args.sessionEmail)
    const validated = validatePromoCodeForCheckout(
      promo,
      subtotal,
      lines.map((l) => ({ productId: l.productId, category: l.category })),
      usage
    )
    if (!validated.valid) {
      throw new Error(validated.error)
    }
    promoDiscount = computePromoDiscountAmount(validated.promo, subtotal)
    promoAllowsStacking = validated.promo.allowVIPStacking !== false
  }

  const vipAllowsStacking = vip?.benefit?.allowPromoCodeStacking !== false
  const serverDiscount = stackVipAndPromoDiscounts({
    subtotal,
    vipDiscount,
    promoDiscount,
    vipAllowsStacking,
    promoAllowsStacking,
  })

  const clientDiscountCents = audCents(draft.discount || 0)
  const serverDiscountCents = audCents(serverDiscount)
  // Attacker path: claimed more off than server allows. Honest UI should match within 1¢.
  if (clientDiscountCents > serverDiscountCents + 1) {
    throw new Error('Discount could not be verified. Please refresh checkout and try again.')
  }

  const paymentType = String(args.paymentType || draft.paymentMethod || '').trim().toLowerCase()
  const paymentOption =
    cms.paymentOptions.find(
      (opt) => String(opt.type || '').toLowerCase() === paymentType && opt.isActive !== false
    ) ||
    cms.paymentOptions.find((opt) => String(opt.type || '').toLowerCase() === paymentType)

  // If CMS has no matching payment row, keep client fee (do not false-reject live checkouts).
  let fee = Math.max(0, Number(draft.paymentFee) || 0)
  if (paymentOption) {
    const serverFee = getPaymentFee(paymentOption, subtotal)
    const clientFeeCents = audCents(draft.paymentFee || 0)
    const serverFeeCents = audCents(serverFee)
    if (Math.abs(clientFeeCents - serverFeeCents) > 1) {
      throw new Error('Payment fee mismatch. Please refresh checkout and try again.')
    }
    fee = Number(serverFee.toFixed(2))
  }

  const discount = Number(serverDiscount.toFixed(2))
  const total = Math.max(0, Number((subtotal + shipping + fee - discount).toFixed(2)))

  const gradeNames = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP']

  return {
    ...draft,
    vipGradeCode: gradeCode,
    vipGradeName: vipDiscount > 0 ? gradeNames[gradeCode] || `Grade ${gradeCode}` : draft.vipGradeName,
    vipDiscount: vipDiscount > 0 ? vipDiscount : undefined,
    promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
    promoCode: promoCodeRaw || undefined,
    paymentFee: fee,
    discount,
    total,
    paymentMethodName:
      paymentOption && typeof (paymentOption as { name?: string }).name === 'string'
        ? String((paymentOption as { name?: string }).name)
        : draft.paymentMethodName,
  }
}
