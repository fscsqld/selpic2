import { describe, expect, it } from 'vitest'
import {
  groupPlExpensesByCategory,
  sumPlExpenseCategories,
} from '@/lib/utils/business-calculations'

/**
 * SELPIC FY 2025–26 Income Statement → Expenses by Category
 * (must sum to Total Expenses $15,346.61).
 */
const SELPIC_FY_EXPENSE_CATEGORIES: Record<string, number> = {
  EXPENSE_OFFICE_EQUIPMENT: 6161.4,
  EXPENSE_CLEANING_SUBCONTRACTOR: 3696.0,
  EXPENSE_TRAVEL_TRANSPORT: 1516.08,
  EXPENSE_ACCOUNTING_FEES: 1133.0,
  EXPENSE_FUEL_TRAVEL: 945.92,
  EXPENSE_STARTUP_COSTS: 661.85,
  EXPENSE_FREIGHT_SHIPPING: 642.8,
  EXPENSE_OFFICE_SUPPLIES: 242.08,
  EXPENSE_TRAVEL_ACCOMMODATION: 211.71,
  EXPENSE_MARKETING: 85.18,
  EXPENSE_MERCHANT_FEES: 26.56,
  EXPENSE_SOFTWARE_SUBSCRIPTIONS: 22.5,
  EXPENSE_BANK_FEES: 1.53,
}

describe('Income Statement expenses by category (FY rollup)', () => {
  it('SELPIC FY category lines sum to Total Expenses $15,346.61', () => {
    expect(sumPlExpenseCategories(SELPIC_FY_EXPENSE_CATEGORIES)).toBeCloseTo(
      15346.61,
      2
    )
  })

  it('groups P&L EXPENSE_* debits and excludes director reimbursement', () => {
    const txs = [
      {
        date: '2026-05-01',
        description: 'Associated Cleaning',
        debit: 3696,
        credit: null,
        category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        department: 'cleaning',
      },
      {
        date: '2026-05-02',
        description: 'NAB Intnl Tran Fee',
        debit: 1.53,
        credit: null,
        category: 'EXPENSE_BANK_FEES',
        department: 'cleaning',
        gstInfo: { gstType: 'FREE' as const },
      },
      {
        date: '2026-06-24',
        description: 'Jinsoo Kim reimbursement',
        debit: 8781.89,
        credit: null,
        category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        department: 'cleaning',
      },
      {
        date: '2026-05-12',
        description: 'ATO GST refund',
        debit: null,
        credit: 18,
        category: 'NON_TAXABLE_ATO_GST_REFUND',
        department: 'general',
      },
    ]
    const byCat = groupPlExpensesByCategory(txs, 'company')
    expect(byCat.EXPENSE_CLEANING_SUBCONTRACTOR).toBeCloseTo(3696, 2)
    expect(byCat.EXPENSE_BANK_FEES).toBeCloseTo(1.53, 2)
    expect(byCat.NON_TAXABLE_DIRECTOR_REIMBURSEMENT).toBeUndefined()
    expect(sumPlExpenseCategories(byCat)).toBeCloseTo(3697.53, 2)
  })
})
