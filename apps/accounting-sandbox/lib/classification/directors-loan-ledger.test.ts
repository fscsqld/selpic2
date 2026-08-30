import { describe, expect, it } from 'vitest'
import { isDirectorsLoanLedgerTransaction } from '@/lib/classification/directors-loan-ledger'

describe('isDirectorsLoanLedgerTransaction', () => {
  it('includes personal department rows', () => {
    expect(isDirectorsLoanLedgerTransaction({ department: 'personal', category: 'EXPENSE_FUEL_TRAVEL' })).toBe(true)
  })

  it('includes director loan injection', () => {
    expect(
      isDirectorsLoanLedgerTransaction({
        department: 'cleaning',
        category: 'LIABILITY_DIRECTORS_LOAN',
        isDirectorsLoan: true,
      })
    ).toBe(true)
  })

  it('includes prior-period director reimbursement debits', () => {
    expect(
      isDirectorsLoanLedgerTransaction({
        department: 'cleaning',
        category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      })
    ).toBe(true)
  })

  it('excludes ordinary business fuel', () => {
    expect(
      isDirectorsLoanLedgerTransaction({
        department: 'cleaning',
        category: 'EXPENSE_FUEL_TRAVEL',
      })
    ).toBe(false)
  })
})
