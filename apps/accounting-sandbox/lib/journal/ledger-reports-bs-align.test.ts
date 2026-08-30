import { describe, expect, it } from 'vitest'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'
import { computeTrialBalance } from '@/lib/utils/trial-balance'

/**
 * SELPIC-like Q4 FY2025-26: opening loan + prior advances + reimbursements,
 * GST-inclusive P&L, bank closing balance on statement.
 */
const SELPIC_LIKE_TRANSACTIONS = [
  {
    date: '2026-04-01',
    description: 'Mr Jinsoo Kim Loan',
    debit: null,
    credit: 500,
    category: 'LIABILITY_DIRECTORS_LOAN',
    department: 'cleaning',
    isDirectorsLoan: true,
  },
  {
    date: '2026-04-07',
    description: 'Associated Cleaning',
    debit: null,
    credit: 6353.6,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
  },
  {
    date: '2026-04-13',
    description: 'MJR Enterprise',
    debit: 2465.87,
    credit: null,
    category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
    department: 'cleaning',
  },
  {
    date: '2026-05-15',
    description: 'More sales',
    debit: null,
    credit: 7053.88,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
  },
  {
    date: '2026-05-20',
    description: 'More subcontractor',
    debit: 1230.13,
    credit: null,
    category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
    department: 'cleaning',
  },
  {
    date: '2026-06-01',
    description: 'Director reimbursement batch',
    debit: 8281.89,
    credit: null,
    category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
    department: 'cleaning',
  },
  {
    date: '2026-06-30',
    description: 'NAB closing balance',
    debit: null,
    credit: 100,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    balance: 7692.73,
  },
]

describe('ledger-integrated BS / TB alignment', () => {
  const baseOptions = {
    transactions: SELPIC_LIKE_TRANSACTIONS,
    openingDirectorLoanBalance: 1000,
    openingCashBalance: 0,
    accountType: 'company' as const,
    asAtDate: '2026-06-30',
    journalEntries: [] as [],
    excludedTransactionIds: new Set<string>(),
  }

  it('balance sheet balances with bank statement closing balance', () => {
    const bs = computeBalanceSheet(baseOptions)

    expect(bs.assets.cashAndBank).toBeCloseTo(7692.73, 2)
    expect(bs.liabilities.directorsLoan).toBeCloseTo(1500, 2)
    expect(bs.isBalanced).toBe(true)
    expect(Math.abs(bs.balanceDifference)).toBeLessThan(0.02)
  })

  it('trial balance matches balance sheet for director loan and GST', () => {
    const bs = computeBalanceSheet(baseOptions)
    const tb = computeTrialBalance(baseOptions)

    const directorsLoanRow = tb.rows.find((r) => r.account === "Director's Loan")
    const gstRow = tb.rows.find((r) => r.account === 'GST Payable')
    const cashRow = tb.rows.find((r) => r.account === 'Cash & Bank')

    expect(tb.isBalanced).toBe(true)
    expect(directorsLoanRow?.credit).toBeCloseTo(bs.liabilities.directorsLoan, 2)
    expect(directorsLoanRow?.debit).toBe(0)
    expect(gstRow?.credit).toBeCloseTo(bs.liabilities.gstPayable, 2)
    expect(cashRow?.debit).toBeCloseTo(bs.assets.cashAndBank, 2)
  })

  it('does not show GL-only director loan debit when opening liability exists', () => {
    const tb = computeTrialBalance(baseOptions)
    const directorsLoanRow = tb.rows.find((r) => r.account === "Director's Loan")

    expect(directorsLoanRow?.debit ?? 0).toBe(0)
    expect(directorsLoanRow?.credit).toBeCloseTo(1500, 2)
  })
})
