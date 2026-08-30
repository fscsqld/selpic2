import { describe, expect, it } from 'vitest'
import { calculatePeriodTaxProvision } from '@/lib/utils/period-tax-provision'

const q2Airfare = {
  date: '2025-12-07',
  description: 'Korea airfare',
  debit: 1516.08,
  credit: null,
  category: 'EXPENSE_TRAVEL_TRANSPORT',
  department: 'cleaning',
  source: 'manual' as const,
  id: 'cash_air',
}

const q4Sale = {
  date: '2026-05-07',
  description: 'Associated Cleaning',
  debit: null,
  credit: 14419.48,
  category: 'INCOME_SALES_CLEANING',
  department: 'cleaning',
  source: 'bank' as const,
}

describe('calculatePeriodTaxProvision', () => {
  it('uses only the selected period — Q2 cash does not pick up FY sales', () => {
    const q2Only = calculatePeriodTaxProvision([q2Airfare], 0.25, 'company')
    expect(q2Only.revenue).toBe(0)
    expect(q2Only.netExpenses).toBeCloseTo(1516.08, 2)
    // Manual cash default is not claimable → ex GST expenses stay at face
    expect(q2Only.netExpensesExGst).toBeCloseTo(1516.08, 2)
    expect(q2Only.taxableIncomeCash).toBeCloseTo(-1516.08, 2)
    expect(q2Only.taxableIncome).toBeCloseTo(-1516.08, 2)
    expect(q2Only.taxProvision).toBe(0)
    expect(q2Only.cashExpenseCount).toBe(1)
    expect(q2Only.bankExpenseCount).toBe(0)
  })

  it('Q4-only trading profit uses tax (ex GST) for provision', () => {
    const q4 = calculatePeriodTaxProvision([q4Sale], 0.25, 'company')
    expect(q4.revenue).toBeCloseTo(14419.48, 2)
    expect(q4.netExpenses).toBe(0)
    expect(q4.taxableIncomeCash).toBeCloseTo(14419.48, 2)
    const incomeEx = 14419.48 - 14419.48 / 11
    expect(q4.taxableIncome).toBeCloseTo(incomeEx, 2)
    expect(q4.taxProvision).toBeCloseTo(incomeEx * 0.25, 2)
  })

  it('unregistered GST keeps tax estimate equal to cash P&L', () => {
    const q4 = calculatePeriodTaxProvision([q4Sale], 0.25, 'company', false)
    expect(q4.taxableIncome).toBeCloseTo(q4.taxableIncomeCash, 2)
    expect(q4.revenueExGst).toBeCloseTo(q4.revenue, 2)
  })

  it('GST-FREE bank fee stays at face in expenses ex-GST', () => {
    const sale = {
      date: '2026-05-07',
      description: 'Sale',
      debit: null,
      credit: 110,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
      source: 'bank' as const,
    }
    const freeFee = {
      date: '2026-05-08',
      description: 'Nab Intnl Tran Fee',
      debit: 11,
      credit: null,
      category: 'EXPENSE_BANK_FEES',
      department: 'cleaning',
      source: 'bank' as const,
      gstInfo: { gstType: 'FREE' as const, gstAmount: 0, netAmount: 11 },
    }
    const taxableBuy = {
      date: '2026-05-09',
      description: 'Officeworks',
      debit: 110,
      credit: null,
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning',
      source: 'bank' as const,
    }
    const m = calculatePeriodTaxProvision([sale, freeFee, taxableBuy], 0.25, 'company')
    expect(m.netExpenses).toBeCloseTo(121, 2)
    expect(m.netExpensesExGst).toBeCloseTo(111, 2) // 11 FREE + 100 net
    expect(m.revenueExGst).toBeCloseTo(100, 2)
    expect(m.taxableIncome).toBeCloseTo(-11, 2)
  })
})
