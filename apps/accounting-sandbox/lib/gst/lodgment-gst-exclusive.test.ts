import { describe, expect, it } from 'vitest'
import {
  aggregateGstExclusiveByCategory,
  lineAmountGstExclusiveExpense,
  lineAmountGstExclusiveIncome,
} from '@/lib/gst/lodgment-gst-exclusive'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { buildMyTaxAnnualFields } from '@/lib/ato-lodgment/mytax-field-map'

describe('lineAmountGstExclusive', () => {
  it('strips GST from included bank fuel', () => {
    expect(
      lineAmountGstExclusiveExpense({
        debit: 945.92,
        category: 'EXPENSE_FUEL_TRAVEL',
        source: 'bank',
      })
    ).toBeCloseTo(945.92 - 945.92 / 11, 2)
  })

  it('keeps manual FREE expense at face', () => {
    expect(
      lineAmountGstExclusiveExpense({
        debit: 661.85,
        category: 'EXPENSE_STARTUP_COSTS',
        source: 'manual',
      })
    ).toBeCloseTo(661.85, 2)
  })

  it('strips GST from taxable sales', () => {
    expect(
      lineAmountGstExclusiveIncome({
        credit: 14419.48,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
      })
    ).toBeCloseTo(14419.48 - 14419.48 / 11, 2)
  })
})

describe('aggregateGstExclusiveByCategory', () => {
  it('FREE line is not diluted by claimable lines', () => {
    const txs = [
      {
        date: '2026-05-01',
        debit: 110,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-05-02',
        debit: 100,
        credit: null,
        category: 'EXPENSE_BANK_FEES',
        department: 'cleaning',
        source: 'manual',
      },
    ] as any

    const { expensesByCategory } = aggregateGstExclusiveByCategory(txs, 'company')
    expect(expensesByCategory.EXPENSE_BANK_FEES).toBeCloseTo(100, 2)
    expect(expensesByCategory.EXPENSE_FUEL_TRAVEL).toBeCloseTo(100, 2)
  })

  it('category ex-GST sum matches metrics totalExpensesExGst', () => {
    const txs = [
      {
        date: '2026-05-07',
        credit: 14419.48,
        debit: null,
        category: 'INCOME_SALES_CLEANING',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-05-10',
        debit: 945.92,
        credit: null,
        category: 'EXPENSE_FUEL_TRAVEL',
        department: 'cleaning',
        source: 'bank',
      },
      {
        date: '2026-05-11',
        debit: 1516.08,
        credit: null,
        category: 'EXPENSE_TRAVEL_TRANSPORT',
        department: 'cleaning',
        source: 'manual',
      },
    ] as any

    const metrics = calculateBusinessMetrics(txs, 0, 'company')
    const { incomeByCategory, expensesByCategory } = aggregateGstExclusiveByCategory(
      txs,
      'company'
    )

    const incomeSum = Object.values(incomeByCategory).reduce((s, n) => s + n, 0)
    const expenseSum = Object.values(expensesByCategory).reduce((s, n) => s + n, 0)

    expect(incomeSum).toBeCloseTo(metrics.totalIncomeExGst, 2)
    expect(expenseSum).toBeCloseTo(metrics.totalExpensesExGst, 2)
  })
})

describe('buildMyTaxAnnualFields per-line ex-GST', () => {
  it('motor uses fuel ex-GST not scaleMap', () => {
    const fuelEx = 945.92 - 945.92 / 11
    const airfareEx = 1516.08
    const fields = buildMyTaxAnnualFields(
      {
        totalIncome: 1000,
        totalExpenses: fuelEx + airfareEx,
        netProfit: 1000 - fuelEx - airfareEx,
        gstPayable: 0,
        gstClaimable: 0,
      },
      {
        incomeByCategory: { INCOME_SALES_SERVICES: 1000 },
        expensesByCategory: {
          EXPENSE_FUEL_TRAVEL: fuelEx,
          EXPENSE_TRAVEL_TRANSPORT: airfareEx,
        },
      }
    )
    const amount = (id: string) => fields.find((f) => f.id === id)?.amount ?? -1
    expect(amount('MYTAX_MOTOR_VEHICLE')).toBeCloseTo(fuelEx, 2)
    expect(amount('MYTAX_OTHER_EXPENSES')).toBeCloseTo(airfareEx, 2)
  })
})
