import { describe, expect, it } from 'vitest'
import {
  buildAnnualMyTaxLedgerCents,
  buildMyTaxAnnualFields,
} from '@/lib/ato-lodgment/mytax-field-map'
import { roundAtoWholeDollars } from '@/lib/utils/ato-lodgment-rounding'
import { aggregateGstExclusiveByCategory } from '@/lib/gst/lodgment-gst-exclusive'

/** SELPIC FY-style expense mix — build ex-GST maps via per-line rules. */
function buildFyExGstMaps() {
  const txs = [
    {
      credit: 14419.48,
      category: 'INCOME_SALES_SERVICES',
      department: 'cleaning',
      source: 'bank',
    },
    { debit: 3827.2, category: 'EXPENSE_OFFICE_EQUIPMENT', department: 'cleaning', source: 'bank' },
    { debit: 3696, category: 'EXPENSE_CLEANING_SUBCONTRACTOR', department: 'cleaning', source: 'bank' },
    { debit: 1516.08, category: 'EXPENSE_TRAVEL_TRANSPORT', department: 'cleaning', source: 'manual' },
    { debit: 1133, category: 'EXPENSE_ACCOUNTING_FEES', department: 'cleaning', source: 'bank' },
    { debit: 945.92, category: 'EXPENSE_FUEL_TRAVEL', department: 'cleaning', source: 'bank' },
    { debit: 661.85, category: 'EXPENSE_STARTUP_COSTS', department: 'cleaning', source: 'manual' },
    { debit: 642.8, category: 'EXPENSE_FREIGHT_SHIPPING', department: 'cleaning', source: 'bank' },
    { debit: 242.08, category: 'EXPENSE_OFFICE_SUPPLIES', department: 'cleaning', source: 'bank' },
    { debit: 211.71, category: 'EXPENSE_TRAVEL_ACCOMMODATION', department: 'cleaning', source: 'bank' },
    { debit: 85.18, category: 'EXPENSE_MARKETING', department: 'cleaning', source: 'bank' },
    { debit: 26.56, category: 'EXPENSE_MERCHANT_FEES', department: 'cleaning', source: 'bank' },
    { debit: 22.5, category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS', department: 'cleaning', source: 'bank' },
    { debit: 1.53, category: 'EXPENSE_BANK_FEES', department: 'cleaning', source: 'bank' },
  ].map((t) => ({ ...t, date: '2026-05-01', credit: t.credit ?? null, debit: t.debit ?? null }))

  return aggregateGstExclusiveByCategory(txs as any, 'company')
}

describe('buildMyTaxAnnualFields expense buckets', () => {
  it('maps sections without confusing cross-buckets (ex-GST)', () => {
    const { incomeByCategory, expensesByCategory } = buildFyExGstMaps()
    const expenseSum = Object.values(expensesByCategory).reduce((s, n) => s + n, 0)
    const incomeSum = Object.values(incomeByCategory).reduce((s, n) => s + n, 0)

    const fields = buildMyTaxAnnualFields(
      {
        totalIncome: incomeSum,
        totalExpenses: expenseSum,
        netProfit: incomeSum - expenseSum,
        gstPayable: 1310.86,
        gstClaimable: 563.83,
      },
      { incomeByCategory, expensesByCategory }
    )

    const amount = (id: string) => fields.find((f) => f.id === id)?.amount ?? -1

    expect(amount('MYTAX_PURCHASES')).toBeCloseTo(0, 2)
    expect(amount('MYTAX_CONTRACTOR')).toBeCloseTo(
      expensesByCategory.EXPENSE_CLEANING_SUBCONTRACTOR ?? 0,
      2
    )
    expect(amount('MYTAX_MOTOR_VEHICLE')).toBeCloseTo(
      expensesByCategory.EXPENSE_FUEL_TRAVEL ?? 0,
      2
    )
    expect(amount('MYTAX_MOTOR_VEHICLE')).toBeCloseTo(945.92 - 945.92 / 11, 1)

    const sectionSum =
      amount('MYTAX_PURCHASES') +
      amount('MYTAX_CONTRACTOR') +
      amount('MYTAX_MOTOR_VEHICLE') +
      amount('MYTAX_DEPRECIATION') +
      amount('MYTAX_OTHER_EXPENSES')
    expect(sectionSum).toBeCloseTo(expenseSum, 2)
    expect(amount('MYTAX_TOTAL_EXPENSES')).toBeCloseTo(expenseSum, 2)
  })

  it('keeps real vehicle costs in motor and airfare out', () => {
    const fuelEx = 945.92 - 945.92 / 11
    const fields = buildMyTaxAnnualFields(
      {
        totalIncome: 1000,
        totalExpenses: fuelEx + 1516.08 + 200 + 80,
        netProfit: 1000 - (fuelEx + 1516.08 + 200 + 80),
        gstPayable: 0,
        gstClaimable: 0,
      },
      {
        incomeByCategory: { INCOME_SALES_SERVICES: 1000 },
        expensesByCategory: {
          EXPENSE_FUEL_TRAVEL: fuelEx,
          EXPENSE_TRAVEL_TRANSPORT: 1516.08,
          EXPENSE_MOTOR_VEHICLE: 200,
          EXPENSE_TRAVEL_PARKING_TOLLS: 80,
        },
      }
    )
    const amount = (id: string) => fields.find((f) => f.id === id)?.amount ?? -1

    expect(amount('MYTAX_MOTOR_VEHICLE')).toBeCloseTo(fuelEx + 200 + 80, 2)
    expect(amount('MYTAX_OTHER_EXPENSES')).toBeCloseTo(1516.08, 2)
  })

  it('buildAnnualMyTaxLedgerCents aligns with field amounts and ATO trunc', () => {
    const { incomeByCategory, expensesByCategory } = buildFyExGstMaps()
    const expenseSum = Object.values(expensesByCategory).reduce((s, n) => s + n, 0)
    const incomeSum = Object.values(incomeByCategory).reduce((s, n) => s + n, 0)
    const metrics = {
      totalIncome: incomeSum,
      totalExpenses: expenseSum,
      netProfit: incomeSum - expenseSum,
      gstPayable: 1310.86,
      gstClaimable: 563.83,
    }

    const ledger = buildAnnualMyTaxLedgerCents(metrics, {
      incomeByCategory,
      expensesByCategory,
    })
    const fields = buildMyTaxAnnualFields(metrics, {
      incomeByCategory,
      expensesByCategory,
    })
    const amount = (id: string) => fields.find((f) => f.id === id)?.amount ?? -1

    expect(ledger.grossPayments).toBeCloseTo(amount('MYTAX_GROSS_PAYMENTS'), 2)
    expect(ledger.totalIncome).toBeCloseTo(amount('MYTAX_TOTAL_INCOME'), 2)
    expect(ledger.totalExpenses).toBeCloseTo(amount('MYTAX_TOTAL_EXPENSES'), 2)
    expect(ledger.netIncome).toBeCloseTo(amount('MYTAX_NET_INCOME'), 2)
    expect(roundAtoWholeDollars(ledger.grossPayments)).toBe(
      roundAtoWholeDollars(amount('MYTAX_GROSS_PAYMENTS'))
    )
  })
})
