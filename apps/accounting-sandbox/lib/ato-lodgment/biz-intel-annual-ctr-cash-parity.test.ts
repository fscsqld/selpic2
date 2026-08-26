import { describe, expect, it } from 'vitest'
import { prepareLodgmentTransactions } from '@/lib/ato-lodgment/prepare-lodgment-transactions'
import {
  computeAnnualLodgment,
  computeCtrLodgment,
  filterByDateRange,
} from '@/lib/ato-lodgment/compute-lodgment'
import { filterTransactionsForDateRange } from '@/lib/dashboard/view-period-range'
import { dedupeTransactions } from '@/lib/dashboard/transaction-dedupe'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

/** SELPIC-style director cash — two same-day Stamp zone purchases. */
const STAMP_A = {
  id: 'cash_stamp_a',
  date: '2026-01-29',
  description: 'Stamp zone',
  debit: 2334.2,
  credit: null as number | null,
  category: 'EXPENSE_OFFICE_SUPPLIES',
  department: 'cleaning' as const,
  source: 'manual' as const,
  confidence: 'Manual' as const,
}

const STAMP_B = {
  ...STAMP_A,
  id: 'cash_stamp_b',
}

const BANK_OPS = {
  id: 'bank_ops',
  date: '2026-04-14',
  description: 'Bank operating costs',
  debit: 6564.72,
  credit: null as number | null,
  category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
  department: 'cleaning' as const,
  source: 'bank' as const,
}

const INCOME = {
  id: 'bank_income',
  date: '2026-05-07',
  description: 'Associated Cleaning',
  debit: null as number | null,
  credit: 14419.48,
  category: 'INCOME_SALES_CLEANING',
  department: 'cleaning' as const,
  source: 'bank' as const,
}

const REIMBURSEMENT = {
  id: 'bank_reimb',
  date: '2026-06-24',
  description: 'Jinsoo Kim reimbursement',
  debit: 4668.4,
  credit: null as number | null,
  category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  department: 'cleaning' as const,
  source: 'bank' as const,
}

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'

describe('Biz Intel FY ↔ ATO Annual / CTR cash expense parity', () => {
  it('keeps two same-day Stamp zone Manual cash rows through statement date repair', () => {
    const fixed = repairStatementDateAnomalies([STAMP_A, STAMP_B, BANK_OPS])
    expect(fixed.filter((tx) => String(tx.id).startsWith('cash_stamp'))).toHaveLength(2)
  })

  it('dedupe keeps distinct cash_* ids with identical fingerprint', () => {
    const result = dedupeTransactions([STAMP_A, STAMP_B, BANK_OPS])
    expect(result.filter((tx) => String(tx.id).startsWith('cash_stamp'))).toHaveLength(2)
  })

  it('prepareLodgmentTransactions does not drop either Stamp zone cash line', () => {
    const prepared = prepareLodgmentTransactions([
      STAMP_A,
      STAMP_B,
      BANK_OPS,
      INCOME,
      REIMBURSEMENT,
    ])
    const stamps = prepared.filter((tx) => String(tx.id).startsWith('cash_stamp'))
    expect(stamps).toHaveLength(2)
    expect(stamps.map((tx) => tx.id).sort()).toEqual(['cash_stamp_a', 'cash_stamp_b'])
  })

  it('Annual + CTR total expenses match Biz Intel FY metrics (both Stamp zones)', () => {
    const ledger = [STAMP_A, STAMP_B, BANK_OPS, INCOME, REIMBURSEMENT]

    const bizIntelFy = filterTransactionsForDateRange(ledger, FY_START, FY_END)
    const bizMetrics = calculateBusinessMetrics(bizIntelFy, 0, 'company')

    const prepared = prepareLodgmentTransactions(ledger)
    const lodgmentFy = filterByDateRange(prepared, FY_START, FY_END)

    const annual = computeAnnualLodgment(lodgmentFy, 0, 'company', '2025-2026')
    const ctr = computeCtrLodgment(lodgmentFy, 0, '2025-2026')

    // Two Stamp zones + bank ops; reimbursement excluded from P&L
    const expectedCashExpenses = 2334.2 + 2334.2 + 6564.72
    expect(bizMetrics.totalExpenses).toBeCloseTo(expectedCashExpenses, 2)

    // ATO Annual / CTR lodge GST-exclusive (tax) totals — same universe, tax basis
    const annualExpenses = annual.fields.find((f) => f.id === 'MYTAX_TOTAL_EXPENSES')?.amount
    const ctrExpenses = ctr.fields.find((f) => f.id === 'CTR_7_TOTAL_EXPENSES')?.amount

    expect(annualExpenses).toBeCloseTo(bizMetrics.totalExpensesExGst, 2)
    expect(ctrExpenses).toBeCloseTo(bizMetrics.totalExpensesExGst, 2)
    expect(annual.taxNetProfit).toBeCloseTo(bizMetrics.netProfitExGst, 2)
    expect(bizMetrics.netProfit).toBeCloseTo(14419.48 - expectedCashExpenses, 2)
  })
})
