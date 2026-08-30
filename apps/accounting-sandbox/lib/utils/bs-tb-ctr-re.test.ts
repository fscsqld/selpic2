import { describe, expect, it } from 'vitest'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'
import { computeTrialBalance } from '@/lib/utils/trial-balance'

/**
 * Minimal FY-style sheet: DL + Q4 GST payable + CTR RE (ex GST).
 * Closing cash balance forces Assets to the statement figure so BS/TB can balance
 * when RE is CTR (not cash Net).
 */
function fixtureTxs() {
  return [
    {
      date: '2026-02-10',
      description: 'Q3 Sales',
      debit: null,
      credit: 1100,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
    },
    {
      date: '2026-02-15',
      description: 'Q3 Expense',
      debit: 1298,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
    },
    {
      date: '2026-04-01',
      description: 'Director loan',
      debit: null,
      credit: 500,
      category: 'LIABILITY_DIRECTORS_LOAN',
      department: 'cleaning',
      isDirectorsLoan: true,
    },
    {
      date: '2026-05-10',
      description: 'Q4 Sales',
      debit: null,
      credit: 11000,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
    },
    {
      date: '2026-05-12',
      description: 'ATO GST refund banked',
      debit: null,
      credit: 18,
      category: 'NON_TAXABLE_ATO_GST_REFUND',
      department: 'general',
    },
    {
      date: '2026-05-20',
      description: 'Q4 Expense',
      debit: 2579.72,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
    },
    {
      date: '2026-06-30',
      description: 'Closing balance',
      debit: null,
      credit: null,
      category: 'NON_TAXABLE_TRANSFER',
      department: 'cleaning',
      balance: 0, // placeholder — overwritten below after first compute if needed
    },
  ]
}

describe('BS + TB CTR retained earnings (GST payable on BS)', () => {
  it('uses CTR RE (not cash) and keeps TB debit/credit aligned with BS', () => {
    const txs = fixtureTxs().filter((t) => t.description !== 'Closing balance')
    const options = {
      transactions: txs,
      openingDirectorLoanBalance: 1000,
      openingCapital: 0,
      openingRetainedEarnings: 0,
      openingCashBalance: 0,
      accountType: 'company' as const,
      asAtDate: '2026-06-30',
    }

    const bs = computeBalanceSheet(options)
    expect(bs.equity.retainedEarnings).toBeCloseTo(bs.equity.currentPeriodProfit, 2)
    expect(bs.equity.retainedEarnings).not.toBeCloseTo(
      bs.equity.currentPeriodProfitCash,
      1
    )
    expect(bs.liabilities.gstPayable).toBeGreaterThan(0)
    expect(bs.liabilities.atoGstRefundInCash).toBeCloseTo(18, 2)

    // Force cash asset to L+E so the CTR identity is testable end-to-end
    const forcedCash = bs.totalLiabilitiesAndEquity
    const withClosing = [
      ...txs,
      {
        date: '2026-06-30',
        description: 'Closing balance',
        debit: null,
        credit: null,
        category: 'NON_TAXABLE_TRANSFER',
        department: 'cleaning',
        balance: forcedCash,
      },
    ]
    const balancedOptions = { ...options, transactions: withClosing }
    const bs2 = computeBalanceSheet(balancedOptions)
    const tb = computeTrialBalance(balancedOptions)

    expect(Math.abs(bs2.balanceDifference)).toBeLessThan(0.02)
    expect(bs2.isBalanced).toBe(true)
    expect(Math.abs(tb.balanceDifference)).toBeLessThan(0.02)
    expect(tb.isBalanced).toBe(true)
  })

  it('debits ATO refund rounding (BAS est − banked) from RE so BS/TB balance', () => {
    // Q3 credit ≈ $18.45 (÷11), ATO banks $18 → $0.45 rounding
    const txs = [
      {
        date: '2026-02-10',
        description: 'Q3 Sales',
        debit: null,
        credit: 1100,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      },
      {
        date: '2026-02-15',
        description: 'Q3 Expense',
        debit: 1302.95,
        credit: null,
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
      },
      {
        date: '2026-05-10',
        description: 'Q4 Sales',
        debit: null,
        credit: 11000,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      },
      {
        date: '2026-05-12',
        description: 'ATO GST refund banked',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'general',
      },
      {
        date: '2026-05-20',
        description: 'Q4 Expense',
        debit: 2579.72,
        credit: null,
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
      },
    ]
    const options = {
      transactions: txs,
      openingDirectorLoanBalance: 0,
      openingCapital: 0,
      openingRetainedEarnings: 0,
      openingCashBalance: 0,
      accountType: 'company' as const,
      asAtDate: '2026-06-30',
    }
    const bs = computeBalanceSheet(options)
    expect(bs.equity.atoGstRefundRounding).toBeCloseTo(0.45, 2)
    expect(bs.equity.retainedEarnings).toBeCloseTo(
      bs.equity.currentPeriodProfit - 0.45,
      2
    )

    const forcedCash = bs.totalLiabilitiesAndEquity
    const balancedOptions = {
      ...options,
      transactions: [
        ...txs,
        {
          date: '2026-06-30',
          description: 'Closing balance',
          debit: null,
          credit: null,
          category: 'NON_TAXABLE_TRANSFER',
          department: 'cleaning',
          balance: forcedCash,
        },
      ],
    }
    const bs2 = computeBalanceSheet(balancedOptions)
    const tb = computeTrialBalance(balancedOptions)
    expect(Math.abs(bs2.balanceDifference)).toBeLessThan(0.02)
    expect(Math.abs(tb.balanceDifference)).toBeLessThan(0.02)
    expect(
      tb.rows.some(
        (r) =>
          r.account === 'ATO GST refund rounding' &&
          Math.abs(r.debit - 0.45) < 0.005
      )
    ).toBe(true)
  })
})
