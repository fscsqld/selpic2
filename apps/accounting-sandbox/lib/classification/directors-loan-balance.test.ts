import { describe, expect, it } from 'vitest'
import {
  resolvePriorPeriodDirectorAdvances,
  resolvePriorAdvancesForScopedWindow,
  sumDirectorReimbursementDebits,
} from '@/lib/classification/directors-loan-balance'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

const DIRECTOR_CASH = [
  {
    date: '2025-12-07',
    description: 'Korea airfare',
    debit: 8781.89,
    credit: null,
    category: 'EXPENSE_TRAVEL_TRANSPORT',
    department: 'cleaning',
    source: 'manual',
    id: 'cash_setup',
    fundedByDirector: true,
  },
]

describe('directors-loan-balance', () => {
  const reimbursements = [
    {
      debit: 129.6,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
    },
    {
      debit: 8781.89 - 129.6,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
    },
  ]

  it('sums reimbursement debits', () => {
    expect(sumDirectorReimbursementDebits(reimbursements)).toBeCloseTo(8781.89, 2)
  })

  it('auto-matches prior advances to reimbursement total when cash is not in the window', () => {
    const prior = resolvePriorPeriodDirectorAdvances(reimbursements as any, 0, true)
    expect(prior).toBeCloseTo(8781.89, 2)
  })

  it('does not double-count prior when director-funded cash is already in the window', () => {
    const txs = [...DIRECTOR_CASH, ...reimbursements] as any
    expect(resolvePriorPeriodDirectorAdvances(txs, 0, true)).toBe(0)
  })

  it('uses manual prior advances when auto-match is off (default for other users)', () => {
    expect(resolvePriorPeriodDirectorAdvances(reimbursements as any, 0, false)).toBe(0)
    expect(resolvePriorPeriodDirectorAdvances(reimbursements as any, 5000, false)).toBe(5000)
  })

  it('closing balance is loan injection when cash + reimbursements settle in same FY', () => {
    const transactions = [
      {
        debit: null,
        credit: 1500,
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        isDirectorsLoan: true,
        date: '2026-04-01',
        description: 'Loan',
      },
      ...DIRECTOR_CASH,
      {
        debit: 8781.89,
        credit: null,
        category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        department: 'cleaning',
        date: '2026-06-24',
        description: 'Director repay',
        source: 'bank',
      },
    ] as any
    const prior = resolvePriorPeriodDirectorAdvances(transactions, 0, true)
    expect(prior).toBe(0)
    const metrics = calculateBusinessMetrics(transactions, 0, 'company', prior)
    // Cash +8781.89 + loan +1500 − reimburse 8781.89 = 1500 (not 10281.89)
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500, 2)
  })

  it('closing balance is loan injection when reimbursements settle prior advances (cash not in window)', () => {
    const transactions = [
      {
        debit: null,
        credit: 500,
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        isDirectorsLoan: true,
        date: '2026-04-01',
        description: 'Loan',
      },
      ...reimbursements,
    ] as any
    const prior = resolvePriorPeriodDirectorAdvances(transactions, 0, true)
    const metrics = calculateBusinessMetrics(transactions, 1000, 'company', prior)
    // Opening 1000 + prior 8781.89 + loan 500 - reimbursements 8781.89 = 1500
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500, 2)
  })

  it('manual prior advances work without auto-match for year-end', () => {
    const transactions = [
      {
        debit: null,
        credit: 500,
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        isDirectorsLoan: true,
        date: '2026-04-01',
        description: 'Loan',
      },
      {
        debit: 8781.89,
        credit: null,
        category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        department: 'cleaning',
        date: '2026-06-24',
        description: 'Director repay',
      },
    ] as any
    const metrics = calculateBusinessMetrics(transactions, 1000, 'company', 8781.89)
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500, 2)
  })

  it('Reports Q4: rolled opening + reimbursements must not auto-add prior (no $10,281.89)', () => {
    // Dec director cash already in rolled opening ($1,000 + $8,781.89 = $9,781.89).
    // Q4 window only has loan injection + reimbursements.
    const q4 = [
      {
        debit: null,
        credit: 500,
        category: 'LIABILITY_DIRECTORS_LOAN',
        department: 'cleaning',
        isDirectorsLoan: true,
        date: '2026-04-01',
        description: 'MR JINSOO KIM Loan',
      },
      ...reimbursements,
    ] as any
    const rolledOpening = 1000 + 8781.89
    const prior = resolvePriorAdvancesForScopedWindow(q4, true, 0, true)
    expect(prior).toBe(0)
    const metrics = calculateBusinessMetrics(q4, rolledOpening, 'company', prior)
    // 9781.89 + 500 - 8781.89 = 1500 (not 10281.89)
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500, 2)
  })

})
