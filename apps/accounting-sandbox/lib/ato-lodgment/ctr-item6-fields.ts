import { roundMoney } from '@/lib/utils/currency-format'
import { roundAtoWholeDollars } from '@/lib/utils/ato-lodgment-rounding'
import type { LodgmentField } from './types'
import { ctrFieldGuide } from './field-guides'
import {
  isContractorExpenseCategory,
  isMotorExpenseCategory,
  isRepairsExpenseCategory,
  otherExpenseTotalFromMap,
  splitBusinessIncomeExGst,
  sumMatchingCategoryMap,
} from './lodgment-expense-buckets'

export interface CtrItem6Input {
  /** GST-exclusive (L2 cents) — from aggregateGstExclusiveByCategory. */
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
  totalIncomeExGst: number
  totalExpensesExGst: number
  netProfitExGst: number
}

function atoLabel(n: number): number {
  return roundAtoWholeDollars(n)
}

/**
 * ATO Company tax return 2026 — Item 6 Calculation of total profit or loss.
 * Mirrors official label order (6R → 6S income; 6C/6Y/6Z/6S → 6Q expenses; 6T).
 * Amounts are whole dollars (leave cents out) for OSB copy-enter.
 */
export function buildCtrItem6Fields(input: CtrItem6Input): LodgmentField[] {
  const { incomeByCategory, expensesByCategory } = input

  const split = splitBusinessIncomeExGst(incomeByCategory)
  const otherGrossIncome =
    split.grossPayments > 0.005
      ? roundMoney(split.grossPayments + split.otherIncome)
      : roundMoney(input.totalIncomeExGst)

  const contractor = sumMatchingCategoryMap(
    expensesByCategory,
    isContractorExpenseCategory
  )
  const motor = sumMatchingCategoryMap(expensesByCategory, isMotorExpenseCategory)
  const repairs = sumMatchingCategoryMap(
    expensesByCategory,
    isRepairsExpenseCategory
  )
  const otherExpenses = otherExpenseTotalFromMap(
    expensesByCategory,
    contractor + motor + repairs
  )

  const totalIncome = atoLabel(input.totalIncomeExGst)
  const totalExpenses = atoLabel(input.totalExpensesExGst)
  const profitOrLoss = atoLabel(input.netProfitExGst)
  const isLoss = input.netProfitExGst < -0.005

  return [
    {
      id: 'CTR_6R_OTHER_GROSS_INCOME',
      label: 'Item 6R — Other gross income',
      description:
        'Assessable business income excluding GST (per-line). Selpic rolls primary sales here when no separate C/D/E lines.',
      section: 'income',
      amount: atoLabel(otherGrossIncome),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Other gross income'),
      sortOrder: 10,
    },
    {
      id: 'CTR_6S_TOTAL_INCOME',
      label: 'Item 6S — Total income',
      description: 'Sum of income labels B–R (ex GST est.).',
      section: 'income',
      amount: totalIncome,
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Total income'),
      sortOrder: 20,
    },
    {
      id: 'CTR_6C_CONTRACTOR',
      label: 'Item 6C — Contractor, sub-contractor and commission expenses',
      section: 'expense',
      amount: atoLabel(contractor),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Contractor expenses'),
      sortOrder: 30,
    },
    {
      id: 'CTR_6Y_MOTOR',
      label: 'Item 6Y — Motor vehicle expenses',
      description: 'Fuel, parking, tolls — not business airfare (ex GST est.).',
      section: 'expense',
      amount: atoLabel(motor),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Motor vehicle expenses'),
      sortOrder: 40,
    },
    {
      id: 'CTR_6Z_REPAIRS',
      label: 'Item 6Z — Repairs and maintenance',
      section: 'expense',
      amount: atoLabel(repairs),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Repairs and maintenance'),
      sortOrder: 50,
    },
    {
      id: 'CTR_6S_OTHER_EXPENSES',
      label: 'Item 6S — All other expenses',
      description:
        'Remaining deductible expenses excluding GST (ex GST est.).',
      section: 'expense',
      amount: atoLabel(otherExpenses),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 All other expenses'),
      sortOrder: 60,
    },
    {
      id: 'CTR_6Q_TOTAL_EXPENSES',
      label: 'Item 6Q — Total expenses',
      description: 'Sum of expense labels B–S (ex GST est.).',
      section: 'expense',
      amount: totalExpenses,
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Total expenses'),
      sortOrder: 70,
    },
    {
      id: 'CTR_6T_PROFIT_LOSS',
      label: isLoss
        ? 'Item 6T — Total profit or loss (L)'
        : 'Item 6T — Total profit or loss',
      description: isLoss
        ? 'Tax-basis loss (ex GST est.) — enter amount and print L on the ATO form.'
        : 'Tax-basis profit before income tax (ex GST est.).',
      section: 'summary',
      amount: Math.abs(profitOrLoss),
      source: 'auto',
      guide: ctrFieldGuide('Item 6 Total profit or loss'),
      sortOrder: 80,
    },
  ]
}

/** Cents (L2) for UI reconciliation columns. */
export function ctrItem6LedgerCents(input: CtrItem6Input) {
  return {
    totalIncome: roundMoney(input.totalIncomeExGst),
    totalExpenses: roundMoney(input.totalExpensesExGst),
    profitOrLoss: roundMoney(input.netProfitExGst),
    motor: sumMatchingCategoryMap(input.expensesByCategory, isMotorExpenseCategory),
  }
}
