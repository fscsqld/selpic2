/**
 * ATO GST/BAS refund cash vs accrual net GST (1A − 1B).
 *
 * Statement closing balances include ATO refund deposits, but P&L metrics exclude
 * NON_TAXABLE_ATO_GST_REFUND. Without adjusting net GST, Cash rises with no credit
 * and Trial Balance / Balance Sheet tilt by the refund amount.
 *
 * General ATO practice (any taxpayer): keep cents in the ledger; BAS labels use
 * whole dollars (leave cents out — see `roundAtoWholeDollars`). ATO then pays or
 * charges the lodged whole-dollar net. Cash therefore often differs from the
 * cents-precision ÷11 estimate by under $1 (e.g. ledger $18.45 → lodge/bank $18).
 * SELPIC Q3 is one instance of that class — not a hard-coded special case.
 *
 * @see lib/utils/ato-lodgment-rounding.ts
 */

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Example only (SELPIC Q3): banked ATO GST refund after whole-dollar BAS lodgment.
 * Prefer the actual `NON_TAXABLE_ATO_GST_REFUND` credit on the statement for each user.
 */
export const ATO_GST_REFUND_BANKED_AUD_EXAMPLE = 18

/** @deprecated Use ATO_GST_REFUND_BANKED_AUD_EXAMPLE — not a universal constant. */
export const ATO_GST_REFUND_BANKED_AUD = ATO_GST_REFUND_BANKED_AUD_EXAMPLE

/**
 * True when `amount` matches a known banked refund or a cents-precision estimate
 * within 50c of that banked whole-dollar amount (ATO leave-cents-out class).
 * Pass the user's actual banked refund — do not rely on the SELPIC example default.
 */
export function isAtoGstRefundBankedOrRoundedEstimate(
  amount: number,
  banked: number
): boolean {
  const a = Math.abs(Number(amount) || 0)
  const b = Math.abs(Number(banked) || 0)
  if (a < 0.005 || b < 0.005) return false
  if (Math.abs(a - b) < 0.005) return true
  // Ledger ÷11 estimate vs whole-dollar banked (ATO truncates; gap under $1)
  return Math.abs(a - b) < 1
}

export function sumAtoGstRefundAmount(
  transactions: Array<{
    category?: string
    debit?: number | null
    credit?: number | null
  }>
): number {
  let total = 0
  for (const tx of transactions) {
    if (tx.category !== 'NON_TAXABLE_ATO_GST_REFUND') continue
    total += Math.abs(Number(tx.credit || tx.debit || 0))
  }
  return roundMoney(total)
}

export function statementClosingBalancePresent(
  transactions: Array<{ balance?: number | null }>
): boolean {
  return transactions.some(
    (tx) => tx.balance != null && Number.isFinite(Number(tx.balance))
  )
}

/**
 * Gap when the cents-precision BAS refund estimate exceeds cash actually banked
 * (ATO pays the whole-dollar lodged amount). E.g. $18.45 − $18.00 = $0.45.
 *
 * Works for any taxpayer: banked = sum of ATO refund credits in Cash;
 * estimate = prior-quarter settled GST credit from the ledger (÷11 cents).
 * Positive gap → rounding debit (reduces RE / TB) so BS stays balanced.
 */
export function atoGstRefundRoundingGap(
  bankedRefundInCash: number,
  basRefundEstimate: number
): number {
  const banked = Math.abs(Number(bankedRefundInCash) || 0)
  const estimate = Math.abs(Number(basRefundEstimate) || 0)
  if (banked < 0.005) return 0
  return roundMoney(Math.max(0, estimate - banked))
}

/**
 * When bank closing cash includes ATO refunds, treat those receipts as clearing
 * GST receivable (or reducing the equity GST bridge): netGst + refunds.
 */
export function adjustNetGstForAtoRefundsInCash(
  netGst: number,
  transactions: Array<{
    category?: string
    debit?: number | null
    credit?: number | null
    balance?: number | null
  }>
): number {
  if (!statementClosingBalancePresent(transactions)) return roundMoney(netGst)
  const refunds = sumAtoGstRefundAmount(transactions)
  if (refunds < 0.005) return roundMoney(netGst)
  return roundMoney(netGst + refunds)
}
