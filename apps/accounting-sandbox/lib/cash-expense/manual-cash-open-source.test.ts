import { describe, expect, it } from 'vitest'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'
import {
  computePeriodDirectorLoanChain,
  formatDirectorLoanCaption,
} from '@/lib/period-management/period-utils'
import { isDirectorsLoanLedgerTransaction } from '@/lib/classification/directors-loan-ledger'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'

/**
 * Open-source / multi-user guards: late Cash Expense entry, director vs company pay,
 * and cross-surface consistency (P&L + DL + bank cash).
 */
describe('Manual cash expense — open-source edge cases', () => {
  const bankRow = {
    date: '2026-04-01',
    description: 'Sales',
    debit: null,
    credit: 2000,
    balance: 2500,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
    source: 'bank',
  }

  it('late-entry Dec airfare without fundedByDirector still hits P&L + Company owes Director', () => {
    const lateAirfare = {
      date: '2025-12-15',
      description: 'Incorporation ASIC fee',
      debit: 576,
      credit: null,
      balance: 0,
      category: 'EXPENSE_STARTUP_INCORPORATION',
      department: 'cleaning',
      source: 'manual',
      id: 'cash_late_1',
    }

    const metrics = calculateBusinessMetrics([bankRow, lateAirfare] as any, 0, 'company', 0)
    expect(metrics.totalExpenses).toBeCloseTo(576, 2)
    expect(metrics.directorsLoanBalance).toBeCloseTo(576, 2)

    const chain = computePeriodDirectorLoanChain([lateAirfare] as any, 0, 0)
    expect(formatDirectorLoanCaption(chain.get('2025-12')!.closing).role).toBe('company_owes')
    expect(chain.get('2025-12')?.closing).toBeCloseTo(576, 2)

    expect(isDirectorsLoanLedgerTransaction({ fundedByDirector: true })).toBe(true)
  })

  it('company petty cash (Paid by Company) does not increase Director Loan', () => {
    const companyCash = {
      date: '2026-05-10',
      description: 'Office supplies from float',
      debit: 45,
      credit: null,
      balance: 0,
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning',
      source: 'manual',
      id: 'cash_company_1',
      paidBy: 'company',
      fundedByDirector: false,
    }

    const metrics = calculateBusinessMetrics([bankRow, companyCash] as any, 0, 'company', 0)
    expect(metrics.totalExpenses).toBeCloseTo(45, 2)
    expect(metrics.directorsLoanBalance).toBe(0)

    // Manual cash must not rewrite statement closing cash (balance: 0 is not bank).
    expect(isManualCashExpenseTx(companyCash as any)).toBe(true)
    expect(bankRow.balance).toBe(2500)
  })

  it('legacy CASH_EXPENSE_PETTY still counts as P&L expense after hydrate', () => {
    const petty = {
      date: '2026-05-12',
      description: 'Petty stationery',
      debit: 12.5,
      credit: null,
      balance: 0,
      category: 'CASH_EXPENSE_PETTY',
      department: 'cleaning',
      source: 'manual',
      id: 'cash_petty',
      paidBy: 'company',
      fundedByDirector: false,
    }
    const metrics = calculateBusinessMetrics([petty] as any, 0, 'company', 0)
    expect(metrics.totalExpenses).toBeCloseTo(12.5, 2)
    expect(metrics.directorsLoanBalance).toBe(0)
  })

  it('Balance Sheet bank cash ignores Cash Expense balance:0', () => {
    const txs = [
      {
        date: '2026-06-01',
        description: 'Bank fee',
        debit: 10,
        credit: null,
        balance: 990,
        category: 'EXPENSE_BANK_FEES_INTEREST',
        department: 'cleaning',
      },
      {
        date: '2026-06-15',
        description: 'Director-paid travel',
        debit: 200,
        credit: null,
        balance: 0,
        category: 'EXPENSE_TRAVEL_TRANSPORT',
        department: 'cleaning',
        source: 'manual',
        id: 'cash_travel',
        fundedByDirector: true,
      },
    ]
    const bs = computeBalanceSheet({
      transactions: txs as any,
      openingDirectorLoanBalance: 0,
      openingCashBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
      assets: [],
    })
    expect(bs.assets.cashAndBank).toBeCloseTo(990, 2)
    expect(bs.liabilities.directorsLoan).toBeCloseTo(200, 2)
  })
})
