/**
 * Cash Expense paid-by / director-funding helpers.
 * Director-funded company costs increase Director's Loan (company owes director)
 * while remaining deductible business expenses when department is not personal.
 *
 * Learned (Selpic): Add Cash Expense is usually paid from the director’s personal
 * account. Bank Director Loan may be $0 while advances still create
 * “Company owes Director”. Period Management was showing Dec airfare as None
 * because legacy rows lacked paidBy/fundedByDirector and keyword infer missed them.
 */

export type CashExpensePaidBy = 'company' | 'director'

export function inferFundedByDirector(expense: {
  fundedByDirector?: boolean
  paidBy?: CashExpensePaidBy | string
  merchant?: string
  description?: string
  category?: string
  source?: string
  id?: string
}): boolean {
  if (expense.fundedByDirector === true || expense.paidBy === 'director') return true
  if (expense.fundedByDirector === false || expense.paidBy === 'company') return false

  const hay = `${expense.merchant || ''} ${expense.description || ''} ${expense.category || ''}`
    .toLowerCase()
    .normalize('NFKC')

  // EN + KO airfare / flight (Dec 2025 Selpic case)
  if (
    /airfare|air\s*fare|flight|qantas|jetstar|virgin\s*australia|항공|비행|항공권|항공료/.test(
      hay
    )
  ) {
    return true
  }
  if (String(expense.category || '').includes('TRAVEL')) {
    return true
  }

  // Legacy Cash Expense with no paidBy: off-bank company cost → assume director paid.
  // Explicit Paid by = Company must set paidBy/fundedByDirector false.
  const isCash =
    expense.source === 'manual' || String(expense.id || '').startsWith('cash_')
  if (isCash) return true

  return false
}

/** Ensure ledger rows used in Period sync / metrics carry fundedByDirector. */
export function withInferredFundedByDirector<
  T extends {
    fundedByDirector?: boolean
    paidBy?: string
    merchant?: string
    description?: string
    category?: string
    source?: string
    id?: string
  },
>(tx: T): T {
  if (tx.fundedByDirector === true || tx.fundedByDirector === false) return tx
  if (tx.source !== 'manual' && !String(tx.id || '').startsWith('cash_')) return tx
  return { ...tx, fundedByDirector: inferFundedByDirector(tx) }
}

export function hydrateFundedByDirectorOnLedger<T extends Parameters<typeof withInferredFundedByDirector>[0]>(
  transactions: T[]
): T[] {
  return transactions.map(withInferredFundedByDirector)
}

/** Sum of director-funded company cash debits (DL liability increase). */
export function sumDirectorFundedCashDebits(
  transactions: Array<{
    debit?: number | null
    department?: string | null
    fundedByDirector?: boolean
    category?: string | null
  }>
): number {
  return transactions.reduce((sum, tx) => {
    if (!tx.fundedByDirector || !tx.debit) return sum
    if (tx.department === 'personal') return sum
    const cat = tx.category || ''
    if (
      cat === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT' ||
      cat === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' ||
      cat === 'LIABILITY_DIRECTORS_LOAN' ||
      cat === 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL'
    ) {
      return sum
    }
    return sum + Math.abs(tx.debit)
  }, 0)
}
