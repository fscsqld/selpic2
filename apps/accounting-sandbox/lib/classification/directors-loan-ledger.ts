/**
 * Transactions that affect Director's Loan Balance (balance sheet / ledger).
 * Matches calculateBusinessMetrics() director-loan logic — including
 * director-funded Cash Expenses (company owes director).
 */

export const DIRECTORS_LOAN_LEDGER_CATEGORIES = new Set([
  'LIABILITY_DIRECTORS_LOAN',
  'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
])

export interface DirectorsLoanLedgerTransaction {
  department?: string
  category?: string
  isDirectorsLoan?: boolean
  fundedByDirector?: boolean
}

/**
 * Positive balance → Company owes Director.
 * Negative balance → Director owes Company.
 */
export function isDirectorsLoanLedgerTransaction(tx: DirectorsLoanLedgerTransaction): boolean {
  if (tx.fundedByDirector) return true
  if (tx.department === 'personal') return true
  if (tx.isDirectorsLoan) return true
  if (tx.category && DIRECTORS_LOAN_LEDGER_CATEGORIES.has(tx.category)) return true
  return false
}
