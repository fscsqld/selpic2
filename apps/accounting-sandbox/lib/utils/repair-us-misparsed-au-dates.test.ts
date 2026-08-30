import { describe, expect, it } from 'vitest'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'
import {
  computeBasLodgment,
  filterByDateRange,
  getQuartersInFinancialYear,
} from '@/lib/ato-lodgment/compute-lodgment'

/** Exact phantom pattern: AU day=01 on Apr/May/Jun stored as US January + 03/06 → March */
const PHANTOM_Q3_US_PARSE = [
  { date: '2026-01-04', description: 'Hanaone Express', debit: 153.2, credit: null, category: 'EXPENSE_FREIGHT_SHIPPING', department: 'cleaning' },
  { date: '2026-01-04', description: 'Mjr', debit: 310.2, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
  { date: '2026-01-05', description: 'BP', debit: 73.55, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
  { date: '2026-01-06', description: 'Cyc Company Pty', debit: 310.2, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning' },
  { date: '2026-03-06', description: 'Liberty', debit: 81.09, credit: null, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning' },
  { date: '2026-03-06', description: 'Etsy', debit: 0.56, credit: null, category: 'EXPENSE_MERCHANT_FEES', department: 'cleaning' },
  { date: '2026-03-06', description: 'Google Australia', debit: 12.98, credit: null, category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS', department: 'cleaning' },
] as const

function aprJunAnchorRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
    description: `Associated Cleaning ${i}`,
    debit: null as number | null,
    credit: 100 + i,
    category: 'INCOME_SALES_CLEANING',
    department: 'cleaning',
  }))
}

describe('repairUsMisparsedAustralianDates', () => {
  it('repairs the 7-tx Jan/Mar phantom tail on an Apr–Jun statement', () => {
    const ledger = [...aprJunAnchorRows(40), ...PHANTOM_Q3_US_PARSE]
    const fixed = repairUsMisparsedAustralianDates(ledger)
    const q3 = getQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!

    expect(filterByDateRange(fixed, q3.startDate, q3.endDate)).toHaveLength(0)

    const q3Result = computeBasLodgment(
      fixed,
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

    const q3 = getQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!
    const q4 = getQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 4)!

    expect(filterByDateRange([aprilSales, aprilFuel], q3.startDate, q3.endDate)).toHaveLength(0)
    expect(filterByDateRange([aprilSales, aprilFuel], q4.startDate, q4.endDate)).toHaveLength(2)
  })

  it('keeps genuine January ISO expenses when ledger is not Apr–Jun dominated', () => {
    const janExpense = {
      date: '2026-01-15',
      description: 'Genuine January',
      debit: 600,
      credit: null as number | null,
      category: 'EXPENSE_OFFICE_SUPPLIES',
      department: 'cleaning',
    }
    const q3 = getQuartersInFinancialYear('2025-2026').find((q) => q.quarter === 3)!
    const fixed = repairUsMisparsedAustralianDates([janExpense, ...aprJunAnchorRows(2)])
    expect(filterByDateRange(fixed, q3.startDate, q3.endDate)).toHaveLength(1)
  })
})
