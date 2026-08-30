import { describe, expect, it } from 'vitest'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'
import { computeTrialBalance } from '@/lib/utils/trial-balance'
import {
  computeStatementCashClearings,
  resolvePeriodCashBalances,
  ROLL_FORWARD_CASH_EXCLUDE_CATEGORIES,
} from '@/lib/utils/statement-cash-clearing'

const baseTx = [
  {
    date: '2026-04-07',
    description: 'Sales',
    debit: null,
    credit: 1100,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
  },
  {
    date: '2026-04-10',
    description: 'Expense',
    debit: 220,
    credit: null,
    category: 'EXPENSE_OFFICE_SUPPLIES',
    department: 'cleaning',
  },
]

describe('resolvePeriodCashBalances (period management)', () => {
  it('derives opening/closing from statement running balances', () => {
    const cash = resolvePeriodCashBalances(
      [
        {
          date: '2026-06-02',
          debit: 100,
          credit: null,
          balance: 900,
          category: 'EXPENSE_OFFICE_SUPPLIES',
        },
        {
          date: '2026-06-15',
          debit: null,
          credit: 50,
          balance: 950,
          category: 'INCOME_SALES_CLEANING',
        },
        {
          date: '2026-06-28',
          debit: 200,
          credit: null,
          balance: 750,
          category: 'EXPENSE_FUEL_TRAVEL',
        },
      ],
      -9999
    )
    // Opening before first tx: 900 - 0 + 100 = 1000
    expect(cash).toEqual({
      openingCash: 1000,
      closingCash: 750,
      source: 'statement',
    })
  })

  it('uses statement balances so ATO credits are not dropped from cash', () => {
    const roll = resolvePeriodCashBalances(
      [
        {
          date: '2026-06-10',
          debit: null,
          credit: 1800,
          category: 'NON_TAXABLE_ATO_GST_REFUND',
        },
      ],
      500
    )
    expect(roll.source).toBe('roll_forward')
    expect(roll.closingCash).toBe(500)

    const stmt = resolvePeriodCashBalances(
      [
        {
          date: '2026-06-10',
          debit: null,
          credit: 1800,
          balance: 2300,
          category: 'NON_TAXABLE_ATO_GST_REFUND',
        },
      ],
      500
    )
    expect(stmt).toEqual({
      openingCash: 500,
      closingCash: 2300,
      source: 'statement',
    })
  })
})

describe('statement-cash-clearing (future statement parse guards)', () => {
  it('excludes TRANSFER_INTERNAL from roll-forward cash like NON_TAXABLE_TRANSFER', () => {
    expect(ROLL_FORWARD_CASH_EXCLUDE_CATEGORIES.has('TRANSFER_INTERNAL')).toBe(true)
    expect(ROLL_FORWARD_CASH_EXCLUDE_CATEGORIES.has('NON_TAXABLE_TRANSFER')).toBe(true)
  })

  it('creates ATO + transfer clearings when closing balance includes them', () => {
    const txs = [
      ...baseTx,
      {
        date: '2026-05-12',
        description: 'ATO I002 refund',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'general',
      },
      {
        date: '2026-05-20',
        description: 'Internal transfer in',
        debit: null,
        credit: 50,
        category: 'NON_TAXABLE_TRANSFER',
        department: 'general',
      },
      {
        date: '2026-06-30',
        description: 'Closing',
        debit: null,
        credit: null,
        category: 'NON_TAXABLE_TRANSFER',
        department: 'cleaning',
        balance: 948, // 1100 - 220 + 18 + 50
      },
    ]
    const clearings = computeStatementCashClearings(txs)
    expect(clearings.atoGstRefundClearing).toBe(18)
    expect(clearings.transferClearing).toBe(50)

    const options = {
      transactions: txs,
      openingDirectorLoanBalance: 0,
      openingCashBalance: 0,
      accountType: 'company' as const,
      asAtDate: '2026-06-30',
      journalEntries: [] as [],
      excludedTransactionIds: new Set<string>(),
      subledgerOpenAR: 0,
      subledgerOpenAP: 0,
    }
    const bs = computeBalanceSheet(options)
    const tb = computeTrialBalance(options)
    expect(bs.isBalanced).toBe(true)
    expect(tb.isBalanced).toBe(true)
    expect(bs.liabilities.atoGstRefundClearing).toBe(18)
    expect(bs.liabilities.transferClearing).toBe(50)
  })

  it('folds orphan cash deposits into directors loan liability', () => {
    const txs = [
      ...baseTx,
      {
        date: '2026-05-01',
        description: 'NABATM DEP',
        debit: null,
        credit: 200,
        category: 'NON_TAXABLE_CASH_DEPOSIT',
        department: 'general',
      },
      {
        date: '2026-06-30',
        description: 'Closing',
        debit: null,
        credit: null,
        category: 'NON_TAXABLE_TRANSFER',
        balance: 1080, // 1100 - 220 + 200
      },
    ]
    const clearings = computeStatementCashClearings(txs)
    expect(clearings.orphanCashDepositToLoan).toBe(200)

    const bs = computeBalanceSheet({
      transactions: txs,
      openingDirectorLoanBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
      journalEntries: [],
      excludedTransactionIds: new Set(),
      subledgerOpenAR: 0,
      subledgerOpenAP: 0,
    })
    expect(bs.liabilities.directorsLoan).toBeCloseTo(200, 2)
    expect(bs.isBalanced).toBe(true)
  })

  it('nets unpaired erroneous payment into suspense/clearing', () => {
    const txs = [
      ...baseTx,
      {
        date: '2026-05-05',
        description: 'Erroneous out',
        debit: 75,
        credit: null,
        category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
        department: 'general',
      },
      {
        date: '2026-06-30',
        description: 'Closing',
        debit: null,
        credit: null,
        category: 'NON_TAXABLE_TRANSFER',
        balance: 805, // 1100 - 220 - 75
      },
    ]
    const clearings = computeStatementCashClearings(txs)
    expect(clearings.erroneousSuspense).toBe(75)

    const bs = computeBalanceSheet({
      transactions: txs,
      openingDirectorLoanBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
      journalEntries: [],
      excludedTransactionIds: new Set(),
      subledgerOpenAR: 0,
      subledgerOpenAP: 0,
    })
    expect(bs.clearingAssets?.erroneousSuspense).toBe(75)
    expect(bs.isBalanced).toBe(true)
  })

  it('does not double-count bank income as Accounts Receivable', () => {
    const bs = computeBalanceSheet({
      transactions: [
        ...baseTx,
        {
          date: '2026-06-30',
          description: 'Closing',
          debit: null,
          credit: null,
          category: 'NON_TAXABLE_TRANSFER',
          balance: 880,
        },
      ],
      openingDirectorLoanBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
      journalEntries: [],
      excludedTransactionIds: new Set(),
      subledgerOpenAR: undefined,
      subledgerOpenAP: 0,
    })
    expect(bs.assets.accountsReceivable).toBe(0)
  })
})
