import { describe, expect, it } from 'vitest'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'

describe('balance sheet GST-inclusive P&L coherence', () => {
  it('keeps directors loan + GST + tax vs cash profit coherent', () => {
    const transactions = [
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
    ]

    const bs = computeBalanceSheet({
      transactions,
      openingDirectorLoanBalance: 1000,
      openingCashBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
    })

    expect(bs.liabilities.directorsLoan).toBeCloseTo(1500, 2)
    expect(bs.liabilities.gstPayable).toBeGreaterThan(0)
    expect(bs.equity.currentPeriodProfitCash).toBeGreaterThan(0)
    expect(bs.equity.currentPeriodProfit).toBeLessThan(
      bs.equity.currentPeriodProfitCash
    )
    expect(bs.equity.retainedEarnings).toBeCloseTo(bs.equity.currentPeriodProfit, 2)
  })
})
