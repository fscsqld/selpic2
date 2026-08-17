import type { OrderRecord } from '@/lib/store'
import {
  auFyQuarterBounds,
  auFyQuarterMidDateIso,
  currentAuFyQuarterPeriodId,
  parseFundraisingPeriod,
} from '@/lib/fundraising/auFinancialQuarter'
import {
  evaluateFundraisingPeriodEligibility,
  isFundraisingCancelledOrRefunded,
} from '@/lib/fundraising/settlementEligibility'

export type NetSalesOrderRow = {
  orderId: string
  date: string
  customerName: string
  promoCode: string
  /** Pre-discount product subtotal (order.subtotal). */
  subtotal: number
  /** Community promo discount applied at checkout (family % OFF). */
  promoDiscount: number
  /**
   * Product total after community promo discount — grant base for this order.
   * Shipping and payment fees are never included.
   */
  eligibleSales: number
  shipping: number
  total: number
  commission: number
  excluded: boolean
  excludeReason?: string
}

/** Round to cents (AUD). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Product amount that earns the Fundraising Cashback Grant.
 * = order product subtotal − community promo discount (family % OFF).
 * Shipping / payment fees are excluded (not part of subtotal).
 */
export function eligibleFundraisingProductTotal(order: Pick<OrderRecord, 'subtotal' | 'promoDiscount'>): number {
  const subtotal = Number(order.subtotal) || 0
  const promoDiscount = Math.max(0, Number(order.promoDiscount) || 0)
  return round2(Math.max(0, subtotal - promoDiscount))
}

/**
 * Net Sales / grant engine (fundraising only — does not modify checkout/promo).
 *
 * Only orders matching `promoCode` (Partner Community Code) are considered.
 * Period inclusion uses payment confirmation (+ bank grace). Cancelled orders earn $0.
 *
 * Total Community Support (netSales) =
 *   sum(subtotal − promoDiscount) for included, non-excluded matching orders.
 * Fundraising Cashback Grant =
 *   Total Community Support × donationRate%.
 */
export function computeFundraisingNetSales(input: {
  orders: OrderRecord[]
  promoCode: string
  periodStartIso: string
  periodEndIso: string
  donationRatePercent: number
}): {
  orderRows: NetSalesOrderRow[]
  orderCount: number
  grossSales: number
  netSales: number
  commissionAmount: number
  awaitingDepositCount: number
} {
  const code = input.promoCode.trim().toUpperCase()
  const rate = input.donationRatePercent / 100

  const orderRows: NetSalesOrderRow[] = []
  let grossSales = 0
  let netSales = 0
  let awaitingDepositCount = 0

  for (const order of input.orders) {
    const orderCode = String(order.promoCode || '').trim().toUpperCase()
    if (!orderCode || orderCode !== code) continue

    const eligibility = evaluateFundraisingPeriodEligibility(
      order,
      input.periodStartIso,
      input.periodEndIso
    )

    // Still show cancel/refund rows that were placed in-window for admin transparency
    // when they fail only due to cancel — optional: skip entirely if outside period
    if (!eligibility.include) {
      if (eligibility.reason === 'Awaiting deposit') {
        awaitingDepositCount += 1
        const subtotal = Number(order.subtotal) || 0
        const promoDiscount = Math.max(0, Number(order.promoDiscount) || 0)
        const eligibleSales = eligibleFundraisingProductTotal(order)
        const shipping = Number(order.shippingPrice ?? (order as { shipping?: number }).shipping ?? 0) || 0
        orderRows.push({
          orderId: order.id,
          date: order.createdAtIso || '',
          customerName: order.customer?.name || order.customer?.email || 'Customer',
          promoCode: orderCode,
          subtotal,
          promoDiscount,
          eligibleSales,
          shipping,
          total: Number(order.total) || 0,
          commission: 0,
          excluded: true,
          excludeReason: eligibility.reason,
        })
      }
      // Outside period / cancel outside: skip row entirely unless cancel was attributed
      const cancelInfo = isFundraisingCancelledOrRefunded(order)
      if (cancelInfo && eligibility.reason === cancelInfo.reason) {
        // Cancelled orders: include in report if payment would have been in period
        // Re-check using placed/confirmed ignoring cancel — simplified: if created in period show excluded
        const created = new Date(order.createdAtIso || 0).getTime()
        const start = new Date(input.periodStartIso).getTime()
        const end = new Date(input.periodEndIso).getTime()
        if (Number.isFinite(created) && created >= start && created <= end) {
          const subtotal = Number(order.subtotal) || 0
          const promoDiscount = Math.max(0, Number(order.promoDiscount) || 0)
          const eligibleSales = eligibleFundraisingProductTotal(order)
          const shipping = Number(order.shippingPrice ?? (order as { shipping?: number }).shipping ?? 0) || 0
          grossSales += subtotal + shipping
          orderRows.push({
            orderId: order.id,
            date: order.createdAtIso || '',
            customerName: order.customer?.name || order.customer?.email || 'Customer',
            promoCode: orderCode,
            subtotal,
            promoDiscount,
            eligibleSales,
            shipping,
            total: Number(order.total) || 0,
            commission: 0,
            excluded: true,
            excludeReason: cancelInfo.reason,
          })
        }
      }
      continue
    }

    const subtotal = Number(order.subtotal) || 0
    const promoDiscount = Math.max(0, Number(order.promoDiscount) || 0)
    const eligibleSales = eligibleFundraisingProductTotal(order)
    const shipping = Number(order.shippingPrice ?? (order as { shipping?: number }).shipping ?? 0) || 0
    const total = Number(order.total) || 0
    grossSales += subtotal + shipping

    const commission = round2(eligibleSales * rate)
    netSales += eligibleSales

    orderRows.push({
      orderId: order.id,
      date: eligibility.attributedAt,
      customerName: order.customer?.name || order.customer?.email || 'Customer',
      promoCode: orderCode,
      subtotal,
      promoDiscount,
      eligibleSales,
      shipping,
      total,
      commission,
      excluded: false,
    })
  }

  orderRows.sort((a, b) => b.date.localeCompare(a.date))
  const included = orderRows.filter((r) => !r.excluded)

  return {
    orderRows,
    orderCount: included.length,
    grossSales: round2(grossSales),
    netSales: round2(netSales),
    commissionAmount: round2(netSales * rate),
    awaitingDepositCount,
  }
}

/**
 * Inclusive order window for a settlement period.
 * Prefers AU FY quarter ids; keeps legacy YYYY-MM for historical rows.
 */
export function periodBounds(period: string): { startIso: string; endIso: string } {
  const parsed = parseFundraisingPeriod(period)
  if (parsed?.kind === 'au_fy_quarter') {
    return auFyQuarterBounds(parsed.fyStartYear, parsed.quarter)
  }
  if (parsed?.kind === 'month') {
    const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(parsed.year, parsed.month, 0, 23, 59, 59, 999))
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }
  const cur = parseFundraisingPeriod(currentAuFyQuarterPeriodId())!
  if (cur.kind === 'au_fy_quarter') return auFyQuarterBounds(cur.fyStartYear, cur.quarter)
  return { startIso: new Date(0).toISOString(), endIso: new Date().toISOString() }
}

/** @deprecated Use currentAuFyQuarterPeriodId — kept for call-site migration. */
export function currentPeriodYYYYMM(d = new Date()): string {
  return currentAuFyQuarterPeriodId(d)
}

/** Mid-period date for rate schedule lookup. */
export function periodRateAnchorIso(period: string): string {
  const parsed = parseFundraisingPeriod(period)
  if (parsed?.kind === 'au_fy_quarter') {
    return auFyQuarterMidDateIso(parsed.fyStartYear, parsed.quarter)
  }
  if (parsed?.kind === 'month') {
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-15`
  }
  return new Date().toISOString().slice(0, 10)
}
