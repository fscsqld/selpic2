import { describe, expect, it } from 'vitest'
import { computeBasLodgment, filterByDateRange } from '@/lib/ato-lodgment/compute-lodgment'
import { listBasQuartersInFinancialYear } from '@/lib/ato-lodgment/compute-lodgment'

describe('BAS quarter date scoping', () => {
  it('does not treat Australian DD/MM April dates as January (Q3)', () => {
    const aprilSales = {
      date: '01/04/2026',
      description: 'Associated Cleaning',
      debit: null as number | null,
      credit: 3526.6,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
    }
    const aprilFuel = {
      date: '09/04/2026',
      description: 'Liberty',
      debit: 84.04,
      credit: null as number | null,
      category: 'EXPENSE_FUEL_TRAVEL',
      department: 'cleaning',
    }

    const q3 = listBasQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!
    const q4 = listBasQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 4)!

    expect(filterByDateRange([aprilSales, aprilFuel], q3.startDate, q3.endDate)).toHaveLength(0)
    expect(filterByDateRange([aprilSales, aprilFuel], q4.startDate, q4.endDate)).toHaveLength(2)

    const q3Result = computeBasLodgment(
      [aprilSales, aprilFuel],
      q3.startDate,
      q3.endDate,
      'quarterly',
      q3.label,
      0,
      'company'
    )
    expect(q3Result.fields.find((f) => f.id === '1B')?.amount ?? -1).toBe(0)
    expect(q3Result.fields.find((f) => f.id === 'G1')?.amount ?? -1).toBe(0)

    const q4Result = computeBasLodgment(
      [aprilSales, aprilFuel],
      q4.startDate,
      q4.endDate,
      'quarterly',
      q4.label,
      0,
      'company'
    )
    expect(q4Result.fields.find((f) => f.id === 'G1')?.amount).toBeCloseTo(3526.6, 2)
  })

  it('keeps genuine January ISO expenses in Q3 only', () => {
    const janExpense = {
      date: '2026-01-15',
      description: 'Legacy imported expense',
      debit: 600,
      credit: null as number | null,
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning',
    }
    const q3 = listBasQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!
    const q4 = listBasQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 4)!

    expect(filterByDateRange([janExpense], q3.startDate, q3.endDate)).toHaveLength(1)
    expect(filterByDateRange([janExpense], q4.startDate, q4.endDate)).toHaveLength(0)

    const q3Result = computeBasLodgment(
      [janExpense],
      q3.startDate,
      q3.endDate,
      'quarterly',
      q3.label,
      0,
      'company'
    )
    expect(q3Result.fields.find((f) => f.id === '1B')?.amount).toBeCloseTo(54.55, 2)
  })
})
