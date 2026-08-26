/**
 * Statement closing cash vs non-P&L movements.
 *
 * When the bank PDF/CSV closing balance is used for Cash & Bank, it already includes
 * ATO refunds, transfers, orphan cash deposits, and erroneous payment legs.
 * P&L metrics exclude those categories — without matching BS/TB credits (or loan
 * adjustments), Debit/Credit and Assets vs L+E tilt by those amounts.
 *
 * Roll-forward cash (no statement balance column) excludes the same categories from
 * cash movement, so clearing stays 0.
 */

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export const TRANSFER_CATEGORIES = new Set([
  'NON_TAXABLE_TRANSFER',
  'TRANSFER_INTERNAL',
])

export const ERRONEOUS_CATEGORIES = new Set([
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
])

/** Categories excluded from roll-forward cash credits (and usually debits). */
export const ROLL_FORWARD_CASH_EXCLUDE_CATEGORIES = new Set([
  'NON_TAXABLE_CASH_DEPOSIT',
  'NON_TAXABLE_TRANSFER',
  'TRANSFER_INTERNAL',
  'NON_TAXABLE_ATO_GST_REFUND',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
])

export type ClearingTx = {
  category?: string
  department?: string
  isDirectorsLoan?: boolean
  debit?: number | null
  credit?: number | null
  balance?: number | null
}

export function statementClosingBalancePresent(
  transactions: Array<{ balance?: number | null }>
): boolean {
  return transactions.some(
    (tx) => tx.balance != null && Number.isFinite(Number(tx.balance))
  )
}

export function sumAtoGstRefundAmount(transactions: ClearingTx[]): number {
  let total = 0
  for (const tx of transactions) {
    if (tx.category !== 'NON_TAXABLE_ATO_GST_REFUND') continue
    total += Math.abs(Number(tx.credit || tx.debit || 0))
  }
  return roundMoney(total)
}

/** Net cash impact: credits positive, debits negative. */
function signedCashImpact(tx: ClearingTx): number {
  return Number(tx.credit || 0) - Number(tx.debit || 0)
}

function isCountedInDirectorsLoanMetrics(tx: ClearingTx): boolean {
  if (tx.category === 'LIABILITY_DIRECTORS_LOAN' || tx.isDirectorsLoan) return true
  if (tx.department === 'personal') return true
  if (
    tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' ||
    tx.category === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT'
  ) {
    return true
  }
  return false
}

/**
 * Cash deposits mapped to director loan in GL but missing personal/loan flags —
 * not in metrics.directorsLoanBalance, still inside statement closing cash.
 */
export function sumOrphanCashDepositCredits(transactions: ClearingTx[]): number {
  let total = 0
  for (const tx of transactions) {
    if (tx.category !== 'NON_TAXABLE_CASH_DEPOSIT') continue
    if (isCountedInDirectorsLoanMetrics(tx)) continue
    if (tx.credit) total += Math.abs(Number(tx.credit))
  }
  return roundMoney(total)
}

export function netTransferCashImpact(transactions: ClearingTx[]): number {
  let total = 0
  for (const tx of transactions) {
    if (!TRANSFER_CATEGORIES.has(String(tx.category || ''))) continue
    // Personal transfers already move directors loan in metrics
    if (tx.department === 'personal' || tx.isDirectorsLoan) continue
    total += signedCashImpact(tx)
  }
  return roundMoney(total)
}

export function netErroneousCashImpact(transactions: ClearingTx[]): number {
  let total = 0
  for (const tx of transactions) {
    if (!ERRONEOUS_CATEGORIES.has(String(tx.category || ''))) continue
    total += signedCashImpact(tx)
  }
  return roundMoney(total)
}

export interface StatementCashClearings {
  /** Credit liability — ATO GST/BAS refunds in closing cash */
  atoGstRefundClearing: number
  /** Credit liability when net non-personal transfers increase cash */
  transferClearing: number
  /** Debit asset when net transfers decrease cash without loan offset */
  transferSuspense: number
  /**
   * Add to directors loan liability (orphan NON_TAXABLE_CASH_DEPOSIT credits).
   * Prefer folding into loan over a separate clearing line.
   */
  orphanCashDepositToLoan: number
  /** Credit liability when erroneous returns exceed outs (net cash in) */
  erroneousClearing: number
  /** Debit asset when erroneous outs exceed returns (net cash out still in closing) */
  erroneousSuspense: number
  /** Total extra credit needed on BS/TB (liabilities) */
  totalCreditClearing: number
  /** Total extra debit needed on BS/TB (assets) */
  totalDebitSuspense: number
}

export function computeStatementCashClearings(
  transactions: ClearingTx[]
): StatementCashClearings {
  const empty: StatementCashClearings = {
    atoGstRefundClearing: 0,
    transferClearing: 0,
    transferSuspense: 0,
    orphanCashDepositToLoan: 0,
    erroneousClearing: 0,
    erroneousSuspense: 0,
    totalCreditClearing: 0,
    totalDebitSuspense: 0,
  }

  if (!statementClosingBalancePresent(transactions)) return empty

  const atoGstRefundClearing = sumAtoGstRefundAmount(transactions)
  const orphanCashDepositToLoan = sumOrphanCashDepositCredits(transactions)

  const transferNet = netTransferCashImpact(transactions)
  const transferClearing = transferNet > 0.005 ? transferNet : 0
  const transferSuspense = transferNet < -0.005 ? Math.abs(transferNet) : 0

  const erroneousNet = netErroneousCashImpact(transactions)
  const erroneousClearing = erroneousNet > 0.005 ? erroneousNet : 0
  const erroneousSuspense = erroneousNet < -0.005 ? Math.abs(erroneousNet) : 0

  const totalCreditClearing = roundMoney(
    atoGstRefundClearing + transferClearing + erroneousClearing
  )
  const totalDebitSuspense = roundMoney(transferSuspense + erroneousSuspense)

  return {
    atoGstRefundClearing,
    transferClearing,
    transferSuspense,
    orphanCashDepositToLoan,
    erroneousClearing,
    erroneousSuspense,
    totalCreditClearing,
    totalDebitSuspense,
  }
}

/** @deprecated use computeStatementCashClearings — kept for existing imports */
export function atoGstRefundsIncludedInCash(transactions: ClearingTx[]): number {
  return computeStatementCashClearings(transactions).atoGstRefundClearing
}
