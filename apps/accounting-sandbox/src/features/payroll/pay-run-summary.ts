/**
 * Pay Run summary helpers — totals for approved / paid payslips (Phase 1).
 * People-ops view: what should leave the bank later, not cash journals.
 */

import type { Payslip } from '@/src/features/payroll/types'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'

export interface PayRunTotals {
  count: number
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
}

export interface PayRunSummary {
  awaitingPayment: PayRunTotals
  paid: PayRunTotals
  /** Net still owed to staff (approved, not marked paid). */
  netAwaitingBankTransfer: number
  /** PAYG accrued on awaiting + paid in scope (remittance board later). */
  paygAccrued: number
  superAccrued: number
}

function emptyTotals(): PayRunTotals {
  return { count: 0, grossPay: 0, taxWithheld: 0, superannuation: 0, netPay: 0 }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function addPayslip(totals: PayRunTotals, p: Payslip): PayRunTotals {
  return {
    count: totals.count + 1,
    grossPay: roundMoney(totals.grossPay + (p.grossPay || 0)),
    taxWithheld: roundMoney(totals.taxWithheld + (p.taxWithheld || 0)),
    superannuation: roundMoney(totals.superannuation + (p.superannuation || 0)),
    netPay: roundMoney(totals.netPay + (p.netPay || 0)),
  }
}

/**
 * Summarise payslips for the people-ops pay board.
 * - awaitingPayment: status approved (confirmed, not yet marked paid)
 * - paid: status paid (transfer recorded in HR; bank match is Phase 4)
 */
export function summarizePayRun(payslips: Payslip[]): PayRunSummary {
  let awaiting = emptyTotals()
  let paid = emptyTotals()

  for (const p of payslips) {
    if (p.status === 'approved') awaiting = addPayslip(awaiting, p)
    else if (p.status === 'paid') paid = addPayslip(paid, p)
  }

  return {
    awaitingPayment: awaiting,
    paid,
    netAwaitingBankTransfer: awaiting.netPay,
    paygAccrued: roundMoney(awaiting.taxWithheld + paid.taxWithheld),
    superAccrued: roundMoney(awaiting.superannuation + paid.superannuation),
  }
}

/** Approved timesheets that still need Mark Paid. */
export function countApprovedUnpaidTimesheets(timesheets: Timesheet[]): number {
  return timesheets.filter((t) => t.status === 'approved').length
}
