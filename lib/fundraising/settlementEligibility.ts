/**
 * Fundraising-only settlement eligibility (does not change checkout for retail customers).
 *
 * Attribution uses payment confirmation time + AU FY quarter bounds + bank grace.
 * Only orders with a matching Partner Community Code are considered by netSales.
 */
import type { OrderRecord } from '@/lib/store'
import { FUNDRAISING_GRANT_PAYOUT_POLICY } from '@/lib/fundraising/auFinancialQuarter'

const PAID_LIKE = new Set([
  'paid',
  'approved',
  'processing',
  'shipped',
  'ready_for_collection',
  'collected',
])

export function orderStatusLower(order: OrderRecord): string {
  return String((order as { status?: string; paymentStatus?: string }).status || (order as { paymentStatus?: string }).paymentStatus || '').toLowerCase()
}

export function isFundraisingCancelledOrRefunded(order: OrderRecord): { excluded: true; reason: string } | null {
  const status = orderStatusLower(order)
  if (status.includes('cancel')) return { excluded: true, reason: 'Cancelled' }
  if (status.includes('refund')) return { excluded: true, reason: 'Refunded' }
  return null
}

/** Noon UTC on the Sydney calendar day after period end (policy proxy for 12:00 Sydney). */
export function bankDepositGraceDeadline(periodEndIso: string): Date {
  const end = new Date(periodEndIso)
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(end)
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)
  const y = num('year')
  const m = num('month')
  const d = num('day')
  return new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0))
}

/**
 * Resolve when payment counts for fundraising attribution.
 * Legacy orders without paymentConfirmedAt: treat paid-like statuses as confirmed at createdAtIso.
 */
export function resolveFundraisingPaymentConfirmedAt(order: OrderRecord): string | null {
  if (order.paymentConfirmedAt) return order.paymentConfirmedAt
  const status = orderStatusLower(order)
  if (PAID_LIKE.has(status)) {
    return order.createdAtIso || null
  }
  return null
}

export type FundraisingPeriodEligibility =
  | { include: true; attributedAt: string }
  | { include: false; reason: string }

/**
 * Whether this order contributes to a fundraising period window.
 * Caller must already have matched Partner Community Code.
 */
export function evaluateFundraisingPeriodEligibility(
  order: OrderRecord,
  periodStartIso: string,
  periodEndIso: string
): FundraisingPeriodEligibility {
  const cancelled = isFundraisingCancelledOrRefunded(order)
  if (cancelled) return { include: false, reason: cancelled.reason }

  const confirmedAt = resolveFundraisingPaymentConfirmedAt(order)
  if (!confirmedAt) {
    return { include: false, reason: 'Awaiting deposit' }
  }

  const start = new Date(periodStartIso).getTime()
  const end = new Date(periodEndIso).getTime()
  const confirmed = new Date(confirmedAt).getTime()
  const placed = new Date(order.createdAtIso || 0).getTime()

  if (!Number.isFinite(confirmed) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return { include: false, reason: 'Invalid dates' }
  }

  const isBank = String(order.paymentMethod || '').toLowerCase() === 'bank'
  if (
    isBank &&
    Number.isFinite(placed) &&
    placed >= start &&
    placed <= end &&
    confirmed <= bankDepositGraceDeadline(periodEndIso).getTime()
  ) {
    return { include: true, attributedAt: confirmedAt }
  }

  if (confirmed >= start && confirmed <= end) {
    return { include: true, attributedAt: confirmedAt }
  }

  return { include: false, reason: 'Outside period' }
}

export const FUNDRAISING_SETTLEMENT_ELIGIBILITY_SUMMARY =
  `Total Community Support for a quarter includes Partner Community Code orders with confirmed payment in that Australian financial-year quarter (Sydney). Bank transfers placed before quarter end and confirmed by 12:00 noon Sydney the next day still count in that quarter. Pending bank deposits are excluded until confirmed. Figures lock ${FUNDRAISING_GRANT_PAYOUT_POLICY.settlementFreezeCalendarDays} calendar days after quarter end.`
