import { describe, expect, it } from 'vitest'
import { buildMyTaxAnnualFields } from '@/lib/ato-lodgment/mytax-field-map'

/** SELPIC FY-style expense mix (GST-inclusive cash totals). */
const FY_EXPENSES = {
  EXPENSE_OFFICE_EQUIPMENT: 3827.2,
  EXPENSE_CLEANING_SUBCONTRACTOR: 3696,
  EXPENSE_TRAVEL_TRANSPORT: 1516.08,
  EXPENSE_ACCOUNTING_FEES: 1133,
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

const FY_EXPENSE_TOTAL = Object.values(FY_EXPENSES).reduce((s, n) => s + n, 0)

describe('buildMyTaxAnnualFields expense buckets', () => {
  it('sums category breakdown to total expenses', () => {
    expect(FY_EXPENSE_TOTAL).toBeCloseTo(13012.41, 2)
  })

  it('maps sections without confusing cross-buckets', () => {
    const fields = buildMyTaxAnnualFields(
      {
        totalIncome: 14419.48,
        totalExpenses: FY_EXPENSE_TOTAL,
        netProfit: 1407.07,
        gstPayable: 1310.86,
        gstClaimable: 563.83,
      },
      {
        incomeByCategory: { INCOME_SALES_SERVICES: 14419.48 },
        expensesByCategory: FY_EXPENSES,
      }
    )

    const amount = (id: string) => fields.find((f) => f.id === id)?.amount ?? -1

    // Purchases = trading stock only — office supplies are NOT purchases
    expect(amount('MYTAX_PURCHASES')).toBeCloseTo(0, 2)

    // Contractor = subcontractor only — accounting fees excluded
    expect(amount('MYTAX_CONTRACTOR')).toBeCloseTo(3696, 2)

    // Motor = fuel + travel transport — accommodation excluded
    expect(amount('MYTAX_MOTOR_VEHICLE')).toBeCloseTo(945.92 + 1516.08, 2)

    const other =
      3827.2 +
      1133 +
      661.85 +
      642.8 +
      242.08 +
      211.71 +
      85.18 +
      26.56 +
      22.5 +
      1.53
    expect(amount('MYTAX_OTHER_EXPENSES')).toBeCloseTo(other, 2)

    const sectionSum =
      amount('MYTAX_PURCHASES') +
      amount('MYTAX_CONTRACTOR') +
      amount('MYTAX_MOTOR_VEHICLE') +
      amount('MYTAX_DEPRECIATION') +
      amount('MYTAX_OTHER_EXPENSES')
    expect(sectionSum).toBeCloseTo(FY_EXPENSE_TOTAL, 2)
    expect(amount('MYTAX_TOTAL_EXPENSES')).toBeCloseTo(FY_EXPENSE_TOTAL, 2)
    expect(amount('MYTAX_NET_INCOME')).toBeCloseTo(1407.07, 2)
  })
})
