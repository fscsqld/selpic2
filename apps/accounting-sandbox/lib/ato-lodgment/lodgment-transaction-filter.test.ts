import { describe, expect, it } from 'vitest'
import {
  filterBankStatementTransactionsForLodgment,
  isPayrollJournalTransaction,
} from '@/lib/ato-lodgment/lodgment-transaction-filter'
import { computeBasLodgment, filterByDateRange, getQuartersInFinancialYear } from '@/lib/ato-lodgment/compute-lodgment'

describe('lodgment-transaction-filter', () => {
  const payrollRows = [
    {
      date: '2026-01-18T06:10:50.905Z',
      description: 'Net Pay - JINSOO KIM',
      debit: null,
      credit: 267,
      category: 'ASSET_CASH',
      source: 'payroll' as const,
      isPayrollTransaction: true,
    },
    {
      date: '2026-01-18T06:10:50.905Z',
      description: 'Wages - JINSOO KIM (2026-01-17 to 2026-01-18)',
      debit: 300,
      credit: null,
      category: 'EXPENSE_DIRECTORS_FEES',
      source: 'payroll' as const,
      isPayrollTransaction: true,
    },
    {
      date: '2026-01-17T02:30:35.840Z',
      description: 'PAYG Withholding - JINSOO KIM',
      debit: null,
      credit: 141,
      category: 'LIABILITY_PAYG_WITHHOLDING',
      source: 'payroll' as const,
      isPayrollTransaction: true,
    },
  ]

  it('detects payroll journal rows', () => {
    expect(isPayrollJournalTransaction(payrollRows[0])).toBe(true)
    expect(isPayrollJournalTransaction(payrollRows[1])).toBe(true)
  })

  it('excludes payroll journals from BAS Q3 GST (no phantom 1B)', () => {
    const q3 = getQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!
    const bankOnly = filterBankStatementTransactionsForLodgment(payrollRows)
    expect(bankOnly).toHaveLength(0)
    expect(filterByDateRange(payrollRows, q3.startDate, q3.endDate)).toHaveLength(3)

    const q3Result = computeBasLodgment(
      bankOnly,
      q3.startDate,
      q3.endDate,
      'quarterly',
      q3.label,
      0,
      'company'
    )
    expect(q3Result.fields.find((f) => f.id === '1B')?.amount).toBe(0)
    expect(q3Result.fields.find((f) => f.id === '7C')?.amount).toBe(0)
  })
})
