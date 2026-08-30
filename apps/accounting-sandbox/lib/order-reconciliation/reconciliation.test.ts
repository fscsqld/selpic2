import { describe, expect, it } from 'vitest'
import {
  isBankDepositCandidate,
  looksLikeNonOrderCredit,
  ORDER_RECON_EXCLUDED_CREDIT_CATEGORIES,
} from '@/lib/order-reconciliation/reconciliation'
import {
  filterTransactionsForPeriod,
  resolvePeriodStatementClosing,
  pickLedgerOpeningBalance,
  computeReconciliationDifference,
  getTransactionKey,
  impliedOpeningFromStatementClose,
  reconcileLedgerOpeningWithStatement,
} from '@/lib/subledger/bank-reconciliation'

describe('Order Reconciliation — deposit candidates', () => {
  it('keeps trading income credits as unmatched deposit candidates', () => {
    expect(
      isBankDepositCandidate({
        date: '2026-05-18',
        description: 'Jason Selpic',
        debit: null,
        credit: 1012,
        category: 'INCOME_SALES_CLEANING',
      })
    ).toBe(true)
    expect(
      isBankDepositCandidate({
        date: '2026-04-07',
        description: 'ASSOCIATED CLEANING',
        debit: null,
        credit: 3526.6,
        category: 'INCOME_SALES_CLEANING',
      })
    ).toBe(true)
  })

  it('excludes Director Loan / ATO / erroneous return / cash expense', () => {
    expect(
      isBankDepositCandidate({
        date: '2026-03-02',
        description: 'MR JINSOO KIM Director Loan',
        debit: null,
        credit: 1000,
        category: 'LIABILITY_DIRECTORS_LOAN',
      })
    ).toBe(false)
    expect(
      isBankDepositCandidate({
        date: '2026-01-15',
        description: 'MR JINSOO KIM Initial',
        debit: null,
        credit: 100,
        category: 'LIABILITY_DIRECTORS_LOAN',
      })
    ).toBe(false)
    expect(
      isBankDepositCandidate({
        date: '2026-05-12',
        description: 'ATO79694194011I002',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
      })
    ).toBe(false)
    expect(
      isBankDepositCandidate({
        date: '2026-06-24',
        description: 'MR JINSOO KIM Return',
        debit: null,
        credit: 50.85,
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
      })
    ).toBe(false)
    expect(
      isBankDepositCandidate({
        date: '2025-12-15',
        description: 'Airfare',
        debit: null,
        credit: 100,
        category: 'INCOME_SALES_CLEANING',
        source: 'manual',
        id: 'cash_1',
      } as any)
    ).toBe(false)

    expect(ORDER_RECON_EXCLUDED_CREDIT_CATEGORIES.has('LIABILITY_DIRECTORS_LOAN')).toBe(true)
  })

  it('excludes misclassified Kim loan credits by description', () => {
    expect(
      looksLikeNonOrderCredit({
        date: '2026-04-01',
        description: 'MR JINSOO KIM Loan',
        debit: null,
        credit: 500,
        category: 'UNCATEGORIZED',
      })
    ).toBe(true)
    expect(
      isBankDepositCandidate({
        date: '2026-04-01',
        description: 'MR JINSOO KIM Loan',
        debit: null,
        credit: 500,
        category: 'UNCATEGORIZED',
      })
    ).toBe(false)
  })
})

describe('Bank Reconciliation — Dec cash-expense-only month', () => {
  it('excludes Cash Expense from period bank lines', () => {
    const rows = [
      {
        date: '2025-12-15',
        description: 'Airfare',
        debit: 1516,
        credit: null,
        balance: 0,
        source: 'manual',
        id: 'cash_1',
      },
      {
        date: '2026-03-02',
        description: 'Fee',
        debit: 10,
        credit: null,
        balance: 90,
        source: 'bank',
      },
    ]
    expect(filterTransactionsForPeriod(rows, '2025-12')).toHaveLength(0)
    expect(filterTransactionsForPeriod(rows, '2026-03')).toHaveLength(1)
  })

  it('empty bank month closing equals opening (not invent $0 from Cash Expense)', () => {
    expect(resolvePeriodStatementClosing([], null, 0)).toBe(0)
    expect(resolvePeriodStatementClosing([], null, 100)).toBe(100)
    expect(
      resolvePeriodStatementClosing(
        [{ date: '2026-03-26', debit: 1.53, credit: null, balance: 795.62 }],
        null,
        0
      )
    ).toBe(795.62)
  })

  it('Feb cash-only month Statement closing equals prior Opening not Settings $0', () => {
    expect(resolvePeriodStatementClosing([], 0, 100)).toBe(100)
    expect(resolvePeriodStatementClosing([], null, 100)).toBe(100)
  })

  it('Mar 2026 — ignores stored statement closing $0 when bank lines exist', () => {
    const marBank = [
      { date: '2026-03-02', description: 'MR JINSOO KIM Director Loan', debit: null, credit: 1000 },
      { date: '2026-03-25', description: 'CRAZYDOMAINS WEBSITE HO', debit: 50.85, credit: null },
      { date: '2026-03-25', description: 'Hanaone Express', debit: 252, credit: null },
      { date: '2026-03-26', description: 'NAB INTNL TRAN FEE', debit: 1.53, credit: null, balance: 795.62 },
    ]
    expect(resolvePeriodStatementClosing(marBank, 0, 100)).toBe(795.62)
    expect(resolvePeriodStatementClosing(marBank, 0, 0)).toBe(795.62)
  })

  it('Mar Difference is $0 when Opening rolls from Feb close $100', () => {
    const opening = pickLedgerOpeningBalance({
      settingsOpeningCash: 0,
      priorReconClosing: 100,
      priorReconStatus: 'completed',
    })
    expect(opening).toBe(100)

    const marBank = [
      { date: '2026-03-02', description: 'MR JINSOO KIM Director Loan', debit: null, credit: 1000 },
      { date: '2026-03-25', description: 'CRAZYDOMAINS WEBSITE HO', debit: 50.85, credit: null },
      { date: '2026-03-25', description: 'Hanaone Express', debit: 252, credit: null },
      { date: '2026-03-26', description: 'NAB INTNL TRAN FEE', debit: 1.53, credit: null },
    ]
    const session = {
      id: 'recon_2026-03',
      periodId: '2026-03',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      statementOpeningBalance: 100,
      statementClosingBalance: 795.62,
      ledgerOpeningBalance: opening,
      clearedTransactionIds: marBank.map((tx, i) => getTransactionKey(tx, i)),
      status: 'open' as const,
      difference: 0,
      createdAt: '',
      updatedAt: '',
    }
    expect(computeReconciliationDifference(session, marBank)).toBeCloseTo(0, 2)
  })

  it('pickLedgerOpeningBalance prefers prior completed close over Settings $0', () => {
    expect(
      pickLedgerOpeningBalance({
        settingsOpeningCash: 0,
        priorReconClosing: 100,
        priorReconStatus: 'completed',
      })
    ).toBe(100)
    expect(
      pickLedgerOpeningBalance({
        settingsOpeningCash: 0,
        priorReconClosing: 0,
        priorReconStatus: 'completed',
        priorComputedClosing: 100,
      })
    ).toBe(100)
  })

  it('Mar Diff $100 heals via implied Opening when Feb completed at stale $0', () => {
    const marBank = [
      { date: '2026-03-02', description: 'MR JINSOO KIM Director Loan', debit: null, credit: 1000 },
      { date: '2026-03-25', description: 'CRAZYDOMAINS WEBSITE HO', debit: 50.85, credit: null },
      { date: '2026-03-25', description: 'Hanaone Express', debit: 252, credit: null },
      { date: '2026-03-26', description: 'NAB INTNL TRAN FEE', debit: 1.53, credit: null, balance: 795.62 },
    ]
    const statementClosing = resolvePeriodStatementClosing(marBank, 0, 0)
    expect(statementClosing).toBe(795.62)
    expect(impliedOpeningFromStatementClose(statementClosing, marBank)).toBeCloseTo(100, 2)

    // Rolled opening stayed $0 because Feb completed with Statement closing $0
    const opening = reconcileLedgerOpeningWithStatement(0, statementClosing, marBank)
    expect(opening).toBeCloseTo(100, 2)

    const session = {
      id: 'recon_2026-03',
      periodId: '2026-03',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      statementOpeningBalance: opening,
      statementClosingBalance: statementClosing,
      ledgerOpeningBalance: opening,
      clearedTransactionIds: marBank.map((tx, i) => getTransactionKey(tx, i)),
      status: 'open' as const,
      difference: 0,
      createdAt: '',
      updatedAt: '',
    }
    expect(computeReconciliationDifference(session, marBank)).toBeCloseTo(0, 2)
  })
})
