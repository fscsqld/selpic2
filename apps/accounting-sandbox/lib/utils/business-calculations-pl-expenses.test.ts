import { describe, expect, it } from 'vitest'
import {
  calculateBusinessMetrics,
  summarizePlExpenseComponents,
} from '@/lib/utils/business-calculations'

/** Director-paid company costs (Selpic Dec 2025 – Mar 2026) that sit on Full statement 07/12/2025–29/06/2026. */
const DIRECTOR_CASH = [
  { date: '2025-12-07', description: 'Korea airfare', debit: 1516.08, category: 'EXPENSE_TRAVEL_TRANSPORT' },
  { date: '2026-01-09', description: 'ASIC', debit: 611.0, category: 'EXPENSE_STARTUP_INCORPORATION' },
  { date: '2026-01-19', description: 'Travel case', debit: 152.1, category: 'EXPENSE_OFFICE_SUPPLIES' },
  { date: '2026-01-23', description: 'IBIS Style', debit: 211.71, category: 'EXPENSE_TRAVEL_ACCOMMODATION' },
  { date: '2026-01-27', description: 'Samsung computer', debit: 599.75, category: 'EXPENSE_OFFICE_EQUIPMENT' },
  { date: '2026-01-29', description: 'Stamp zone 1', debit: 2334.2, category: 'EXPENSE_OFFICE_SUPPLIES' },
  { date: '2026-01-29', description: 'Stamp zone 2', debit: 2334.2, category: 'EXPENSE_OFFICE_SUPPLIES' },
  { date: '2026-02-11', description: 'Hanaone cash', debit: 129.6, category: 'EXPENSE_FREIGHT_SHIPPING' },
  { date: '2026-03-19', description: 'Mirprintec', debit: 893.25, category: 'EXPENSE_FREIGHT_SHIPPING' },
].map((tx, i) => ({
  ...tx,
  credit: null,
  department: 'cleaning' as const,
  source: 'manual' as const,
  id: `cash_${i}`,
}))

describe('Full-statement P&L expenses', () => {
  it('sums director cash + bank operating costs; bank reimbursements are not double-counted', () => {
    const cashTotal = DIRECTOR_CASH.reduce((s, t) => s + t.debit, 0)
    expect(cashTotal).toBeCloseTo(8781.89, 2)

    const bankOperating = {
      date: '2026-04-14',
      description: 'Bank operating (subcontract / fuel / freight …)',
      debit: 6564.72,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
      source: 'bank',
    }
    const bankReimbursement = {
      date: '2026-04-01',
      description: 'Jinsoo Kim reimbursement',
      debit: 8781.89,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
      source: 'bank',
    }

    const parts = summarizePlExpenseComponents(
      [...DIRECTOR_CASH, bankOperating, bankReimbursement],
      'company'
    )
    expect(parts.cash).toBeCloseTo(8781.89, 2)
    expect(parts.bank).toBeCloseTo(6564.72, 2)
    expect(parts.total).toBeCloseTo(15346.61, 2)
    expect(parts.reimbursementsExcluded).toBeCloseTo(8781.89, 2)

    const metrics = calculateBusinessMetrics(
      [...DIRECTOR_CASH, bankOperating, bankReimbursement],
      0,
      'company'
    )
    expect(metrics.totalExpenses).toBeCloseTo(15346.61, 2)
    expect(metrics.totalIncome).toBe(0)
  })

  it('Dec–Jun net loss is Q4 trading minus cash setup, not a second count of director repayments', () => {
    const trading = {
      date: '2026-05-07',
      description: 'Associated Cleaning',
      debit: null,
      credit: 14419.48,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
      source: 'bank',
    }
    const bankOperating = {
      date: '2026-04-14',
      description: 'Bank operating',
      debit: 6564.72,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
      source: 'bank',
    }
    const bankReimbursement = {
      date: '2026-06-24',
      description: 'Jinsoo Kim reimbursement',
      debit: 8781.89,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
      source: 'bank',
    }
    const metrics = calculateBusinessMetrics(
      [...DIRECTOR_CASH, trading, bankOperating, bankReimbursement],
      0,
      'company'
    )
    expect(metrics.totalIncome).toBeCloseTo(14419.48, 2)
    expect(metrics.totalExpenses).toBeCloseTo(15346.61, 2)
    expect(metrics.netProfit).toBeCloseTo(-927.13, 2)
    const operating = metrics.totalIncome - 6564.72
    expect(operating).toBeCloseTo(7854.76, 2)
    expect(operating - 8781.89).toBeCloseTo(-927.13, 2)
  })

  it('does not double-count Q4 bank repayments miscategorised as EXPENSE_* when cash already sits in P&L', () => {
    const misfiled = DIRECTOR_CASH.map((tx, i) => ({
      date: '2026-06-24',
      description: `Jinsoo Kim K22${i}5369739`,
      debit: tx.debit,
      credit: null,
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning' as const,
      source: 'bank' as const,
    }))
    const parts = summarizePlExpenseComponents(
      [
        ...DIRECTOR_CASH,
        {
          date: '2026-04-14',
          description: 'Bank operating (subcontract / fuel / freight …)',
          debit: 6564.72,
          credit: null,
          category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
          department: 'cleaning',
          source: 'bank',
        },
        ...misfiled,
      ],
      'company'
    )
    expect(parts.cash).toBeCloseTo(8781.89, 2)
    expect(parts.bank).toBeCloseTo(6564.72, 2)
    expect(parts.total).toBeCloseTo(15346.61, 2)
    expect(parts.reimbursementsExcluded).toBeCloseTo(8781.89, 2)
  })

  it('excludes personal and director-loan debits from this period costs', () => {
    const parts = summarizePlExpenseComponents(
      [
        {
          date: '2026-02-01',
          description: 'Bunnings',
          debit: 40,
          credit: null,
          category: 'EXPENSE_OFFICE_SUPPLIES',
          department: 'cleaning',
          source: 'bank',
        },
        {
          date: '2026-02-02',
          description: 'Coles',
          debit: 90,
          credit: null,
          category: 'EXPENSE_MEALS_ENTERTAINMENT',
          department: 'personal',
          source: 'bank',
        },
        {
          date: '2026-02-03',
          description: 'Loan repayment',
          debit: 500,
          credit: null,
          category: 'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
          department: 'cleaning',
          source: 'bank',
        },
      ],
      'company'
    )
    expect(parts.total).toBeCloseTo(40, 2)
  })
})

describe('Q3 P&L — company bank statement plus director cash', () => {
  it('keeps both Q3 bank costs and Add Cash Expense (does not fold bank into Q4)', async () => {
    const { repairUsMisparsedAustralianDates } = await import(
      '@/lib/utils/repair-us-misparsed-au-dates'
    )
    const q3Cash = DIRECTOR_CASH.filter(
      (tx) => tx.date >= '2026-01-01' && tx.date <= '2026-03-31'
    )
    const cashTotal = q3Cash.reduce((s, t) => s + t.debit, 0)
    expect(cashTotal).toBeCloseTo(7265.81, 2)

    const aprJunBank = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
      description: `Q4 bank ${i}`,
      debit: null as number | null,
      credit: 10,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning' as const,
      source: 'bank' as const,
    }))
    // Real Jan–Mar company-account costs (day > 12 so AU/US swap cannot steal them).
    const q3CompanyBank = [
      {
        date: '2026-01-14',
        description: 'BP',
        debit: 61.64,
        credit: null as number | null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning' as const,
        source: 'bank' as const,
      },
      {
        date: '2026-01-19',
        description: 'Liberty',
        debit: 84.04,
        credit: null as number | null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning' as const,
        source: 'bank' as const,
      },
      {
        date: '2026-02-11',
        description: 'Company freight',
        debit: 158.7,
        credit: null as number | null,
        category: 'EXPENSE_FREIGHT_SHIPPING',
        department: 'cleaning' as const,
        source: 'bank' as const,
      },
    ]
    expect(q3CompanyBank.reduce((s, t) => s + t.debit, 0)).toBeCloseTo(304.38, 2)

    const fixed = repairUsMisparsedAustralianDates([
      ...aprJunBank,
      ...q3CompanyBank,
      ...q3Cash,
    ])
    const inQ3 = fixed.filter(
      (tx) => tx.date >= '2026-01-01' && tx.date <= '2026-03-31'
    )
    const parts = summarizePlExpenseComponents(inQ3, 'company')
    expect(parts.bank).toBeCloseTo(304.38, 2)
    expect(parts.cash).toBeCloseTo(7265.81, 2)
    expect(parts.total).toBeCloseTo(7570.19, 2)

    const metrics = calculateBusinessMetrics(inQ3, 0, 'company')
    expect(metrics.totalIncome).toBe(0)
    expect(metrics.totalExpenses).toBeCloseTo(7570.19, 2)
    expect(metrics.netProfit).toBeCloseTo(-7570.19, 2)
  })
})
