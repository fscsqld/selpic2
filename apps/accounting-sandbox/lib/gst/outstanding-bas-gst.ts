/**
 * Outstanding BAS GST on the Balance Sheet vs period-net 1A−1B.
 *
 * Learned (SELPIC FY): FY net GST Payable $747 ≈ Q4 due $765 − Q3 trading credit $18.
 * After earlier quarters are lodged and any ATO refund is paid into the bank, the
 * liability that remains is the **latest BAS quarter** net.
 *
 * ATO bank deposits (NON_TAXABLE_ATO_GST_REFUND) are Cash — not a GST payable
 * reduction labelled “prior BAS credits”.
 */

import {
  breakdownGstByBasQuarter,
  type GstQuarterSlice,
} from '@/lib/gst/gst-period-breakdown'
import {
  calculateBusinessMetrics,
  type Transaction,
} from '@/lib/utils/business-calculations'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export type OutstandingBasGstPosition = {
  latestQuarter: GstQuarterSlice | null
  /** max(0, latest quarter 1A − 1B) — amount still due for that BAS */
  outstandingPayable: number
  /** max(0, latest quarter 1B − 1A) */
  outstandingReceivable: number
  /** max(0, whole-window 1A − 1B) — keeps BS coherent with cash P&L */
  periodNetPayable: number
  /** Prior quarters' net credits already in the window (e.g. Q3 ~$18 refund) */
  settledPriorCreditsInPeriod: number
}

/**
 * Latest BAS quarter ending on/before asAtDate that has GST activity in `transactions`.
 */
export function resolveOutstandingBasGstPosition(
  transactions: Transaction[],
  asAtDate: string,
  accountType: 'individual' | 'company' | 'sole_trader' = 'company',
  gstRegistered: boolean = true
): OutstandingBasGstPosition {
  const empty: OutstandingBasGstPosition = {
    latestQuarter: null,
    outstandingPayable: 0,
    outstandingReceivable: 0,
    periodNetPayable: 0,
    settledPriorCreditsInPeriod: 0,
  }
  if (!gstRegistered || accountType === 'individual' || transactions.length === 0) {
    return empty
  }

  const metrics = calculateBusinessMetrics(
    transactions,
    0,
    accountType,
    0,
    gstRegistered
  )
  const periodNet = roundMoney(metrics.gstPayable - metrics.gstClaimable)
  const periodNetPayable = periodNet > 0 ? periodNet : 0

  const slices = breakdownGstByBasQuarter(
    transactions,
    accountType,
    gstRegistered
  ).filter((s) => s.endDate <= asAtDate)

  if (slices.length === 0) {
    return { ...empty, periodNetPayable }
  }

  const latest = slices[slices.length - 1]
  const latestNet = roundMoney(latest.gstPayable - latest.gstClaimable)
  const outstandingPayable = latestNet > 0 ? latestNet : 0
  const outstandingReceivable = latestNet < 0 ? roundMoney(-latestNet) : 0
  const settledPriorCreditsInPeriod = roundMoney(
    Math.max(0, outstandingPayable - periodNetPayable)
  )

  return {
    latestQuarter: latest,
    outstandingPayable,
    outstandingReceivable,
    periodNetPayable,
    settledPriorCreditsInPeriod,
  }
}
