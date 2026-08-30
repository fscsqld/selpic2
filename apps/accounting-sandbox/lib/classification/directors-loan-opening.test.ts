import { describe, expect, it } from 'vitest'
import {
  computeDirectorsLoanOpeningAtRangeStart,
  transactionsBeforeDate,
} from '@/lib/classification/directors-loan-opening'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

describe('directors-loan-opening (quarter / FY roll-forward)', () => {
  const settingsOpening = 1000
  const decCash = {
    date: '2025-12-15',
    description: 'Airfare',
    debit: 1516.08,
    credit: null,
    category: 'EXPENSE_TRAVEL_TRANSPORT',
    department: 'cleaning',
    fundedByDirector: true,
    source: 'manual',
    id: 'cash_air',
  }
  const aprLoan = {
    date: '2026-04-01',
    description: 'Director loan',
    debit: null,
    credit: 500,
    category: 'LIABILITY_DIRECTORS_LOAN',
    department: 'cleaning',
    isDirectorsLoan: true,
  }
  const junReimburse = {
    date: '2026-06-24',
    description: 'Reimburse',
    debit: 8781.89,
    credit: null,
    category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
    department: 'cleaning',
  }

  const ledger = [decCash, aprLoan, junReimburse] as any

  it('splits txs before quarter start', () => {
    expect(transactionsBeforeDate(ledger, '2026-04-01')).toHaveLength(1)
    expect(transactionsBeforeDate(ledger, '2025-07-01')).toHaveLength(0)
  })

  it('Q4 opening includes Dec director-funded cash (not Settings alone)', () => {
    const opening = computeDirectorsLoanOpeningAtRangeStart(
      ledger,
      settingsOpening,
      'company',
      '2026-04-01'
    )
    expect(opening).toBeCloseTo(1000 + 1516.08, 2)
  })

  it('FY opening equals Settings when no pre-FY DL activity', () => {
    const opening = computeDirectorsLoanOpeningAtRangeStart(
      ledger,
      settingsOpening,
      'company',
      '2025-07-01'
    )
    expect(opening).toBe(1000)
  })

  it('Q4 closing matches full-chain continuity (no auto prior when roll-forward used)', () => {
    const opening = computeDirectorsLoanOpeningAtRangeStart(
      ledger,
      settingsOpening,
      'company',
      '2026-04-01'
    )
    const q4 = [aprLoan, junReimburse] as any
    const closing = calculateBusinessMetrics(q4, opening, 'company', 0).directorsLoanBalance
    const fyClosing = calculateBusinessMetrics(ledger, settingsOpening, 'company', 0)
      .directorsLoanBalance
    expect(closing).toBeCloseTo(fyClosing, 2)
    expect(closing).toBeCloseTo(1000 + 1516.08 + 500 - 8781.89, 2)
  })
})
