/**
 * Director's loan balance — balance sheet only (not P&L / GST).
 *
 * Positive → Company owes Director.
 * Negative → Director owes Company.
 *
 * Prior-period personal spending lodged with the accountant increases what the
 * company owes the director BEFORE bank reimbursements in the current period.
 */

import type { Transaction } from '@/lib/utils/business-calculations'
import { sumDirectorFundedCashDebits } from '@/lib/cash-expense/funded-by-director'

export const PRIOR_PERIOD_DIRECTOR_ADVANCES_STORAGE_KEY = 'prior_period_director_advances'
export const PRIOR_ADVANCES_AUTO_MATCH_STORAGE_KEY = 'prior_advances_auto_match_reimbursements'

export function sumDirectorReimbursementDebits(
  transactions: Array<Pick<Transaction, 'debit' | 'category'>>
): number {
  return transactions
    .filter((tx) => tx.category === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT' && tx.debit)
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
}

/**
 * Prior-period advances lodged with accountant (company liability to director).
 * When auto-match is on and no manual value, residual =
 * max(0, reimbursements − director-funded cash already in this window)
 * so we do not double-count Cash Expense advances that sit in the same P&L range.
 */
export function resolvePriorPeriodDirectorAdvances(
  transactions: Array<
    Pick<Transaction, 'debit' | 'category'> & {
      fundedByDirector?: boolean
      department?: string | null
    }
  >,
  manualAmount: number,
  autoMatchReimbursements: boolean
): number {
  if (!autoMatchReimbursements && manualAmount > 0) return manualAmount
  if (manualAmount > 0) return manualAmount
  if (!autoMatchReimbursements) return 0
  const reimbursements = sumDirectorReimbursementDebits(transactions)
  const fundedInWindow = sumDirectorFundedCashDebits(transactions)
  return Math.max(0, Math.round((reimbursements - fundedInWindow) * 100) / 100)
}

export function computeDirectorsLoanOpeningBase(
  openingDirectorLoanBalance: number,
  priorPeriodDirectorAdvances: number
): number {
  return openingDirectorLoanBalance + priorPeriodDirectorAdvances
}

/**
 * Prior plug for a scoped report / Biz Intel window.
 * When opening was rolled forward through ledger history before the window,
 * auto-match must be 0 — otherwise Q4 reimbursements re-add advances already
 * sitting in the rolled opening (Reports DL Ledger $10,281.89 bug).
 */
export function resolvePriorAdvancesForScopedWindow(
  transactionsInWindow: Array<
    Pick<Transaction, 'debit' | 'category'> & {
      fundedByDirector?: boolean
      department?: string | null
    }
  >,
  hasHistoryBeforeWindow: boolean,
  manualAmount: number,
  autoMatchReimbursements: boolean
): number {
  if (manualAmount > 0) {
    return resolvePriorPeriodDirectorAdvances(
      transactionsInWindow,
      manualAmount,
      autoMatchReimbursements
    )
  }
  if (hasHistoryBeforeWindow) return 0
  return resolvePriorPeriodDirectorAdvances(
    transactionsInWindow,
    0,
    autoMatchReimbursements
  )
}

export type DirectorLoanAdvanceSettings = {
  manualPriorAdvances: number
  autoMatchReimbursements: boolean
}

export function loadDirectorLoanAdvanceSettings(): DirectorLoanAdvanceSettings {
  if (typeof window === 'undefined') {
    return { manualPriorAdvances: 0, autoMatchReimbursements: false }
  }
  try {
    const manual = Number(localStorage.getItem(PRIOR_PERIOD_DIRECTOR_ADVANCES_STORAGE_KEY) || '0')
    const auto = localStorage.getItem(PRIOR_ADVANCES_AUTO_MATCH_STORAGE_KEY) === 'true'
    return {
      manualPriorAdvances: Number.isFinite(manual) ? manual : 0,
      autoMatchReimbursements: auto,
    }
  } catch {
    return { manualPriorAdvances: 0, autoMatchReimbursements: false }
  }
}

export function saveDirectorLoanAdvanceSettings(
  manualPriorAdvances: number,
  autoMatchReimbursements: boolean
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRIOR_PERIOD_DIRECTOR_ADVANCES_STORAGE_KEY, String(manualPriorAdvances))
  localStorage.setItem(
    PRIOR_ADVANCES_AUTO_MATCH_STORAGE_KEY,
    autoMatchReimbursements ? 'true' : 'false'
  )
}

export function sumDirectorLoanInjectionCredits(
  transactions: Array<{ credit?: number | null; category?: string | null }>
): number {
  return transactions
    .filter((tx) => {
      const cat = (tx.category || '').toUpperCase()
      return (
        cat.includes('DIRECTOR') &&
        (cat.includes('LOAN') || cat.includes('INJECT')) &&
        (tx.credit || 0) > 0
      )
    })
    .reduce((sum, tx) => sum + Math.abs(Number(tx.credit) || 0), 0)
}
