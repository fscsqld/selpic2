/**
 * PAYG / Super remittance due vs bank clears (Phase 5).
 */

import type { Payslip } from './types'
import type { BankDebitLike } from './bank-pay-run-match'

export interface RemittanceDueSummary {
  paygAccrued: number
  paygCleared: number
  paygDue: number
  superAccrued: number
  superCleared: number
  superDue: number
  netAwaitingTransfer: number
  netAwaitingCount: number
  payslipCount: number
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Accrued from approved/paid payslips; cleared from bank lines tagged
 * clearsPayrollLiability with matching kind.
 */
export function computeRemittanceDue(
  payslips: Payslip[],
  bankDebits: BankDebitLike[]
): RemittanceDueSummary {
  const relevant = payslips.filter(
    (p) => p.status === 'approved' || p.status === 'paid'
  )

  const paygAccrued = roundMoney(
    relevant.reduce((s, p) => s + (p.taxWithheld || 0), 0)
  )
  const superAccrued = roundMoney(
    relevant.reduce((s, p) => s + (p.superannuation || 0), 0)
  )

  let paygCleared = 0
  let superCleared = 0
  for (const tx of bankDebits) {
    if (!tx.clearsPayrollLiability || !tx.debit) continue
    if (tx.payrollClearKind === 'payg_remittance') {
      paygCleared += Number(tx.debit)
    } else if (tx.payrollClearKind === 'super_remittance') {
      superCleared += Number(tx.debit)
    }
  }
  paygCleared = roundMoney(paygCleared)
  superCleared = roundMoney(superCleared)

  const awaiting = relevant.filter(
    (p) =>
      p.status === 'approved' ||
      (p.status === 'paid' && !p.bankMatchedTransactionKey)
  )
  // Prefer unpaid approved nets for "still to transfer"
  const toTransfer = relevant.filter((p) => p.status === 'approved')
  const netAwaitingTransfer = roundMoney(
    toTransfer.reduce((s, p) => s + (p.netPay || 0), 0)
  )

  return {
    paygAccrued,
    paygCleared,
    paygDue: roundMoney(Math.max(0, paygAccrued - paygCleared)),
    superAccrued,
    superCleared,
    superDue: roundMoney(Math.max(0, superAccrued - superCleared)),
    netAwaitingTransfer,
    netAwaitingCount: toTransfer.length,
    payslipCount: relevant.length,
  }
}
