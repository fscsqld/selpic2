import { getCategoryDisplayName } from '@/lib/utils/category-display'
import { roundMoney } from '@/lib/utils/currency-format'
import type { LodgmentField } from './types'
import { myTaxFieldGuide } from './field-guides'
import {
  isContractorExpenseCategory,
  isMotorExpenseCategory,
  isPurchaseExpenseCategory,
  isRepairsExpenseCategory,
  otherExpenseTotalFromMap,
  splitBusinessIncomeExGst,
  sumMatchingCategoryMap,
} from './lodgment-expense-buckets'

/**
 * Totals passed here must already be the GST-exclusive (L2 tax) basis.
 * Category maps must come from `aggregateGstExclusiveByCategory` — no scaleMap.
 */
export interface MyTaxMetricsInput {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
}

export interface MyTaxCategoryInput {
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
}

/**
 * myTax / Annual worksheet fields for ATO copy-enter (L2 cents).
 */
export function buildMyTaxAnnualFields(
  metrics: MyTaxMetricsInput,
  categories: MyTaxCategoryInput
): LodgmentField[] {
  const { incomeByCategory, expensesByCategory } = categories

  const contractor = sumMatchingCategoryMap(
    expensesByCategory,
    isContractorExpenseCategory
  )
  const motor = sumMatchingCategoryMap(expensesByCategory, isMotorExpenseCategory)
  const purchases = sumMatchingCategoryMap(
    expensesByCategory,
    isPurchaseExpenseCategory
  )
  const split = splitBusinessIncomeExGst(incomeByCategory)
  const grossPayments =
    split.grossPayments > 0.005
      ? split.grossPayments
      : roundMoney(metrics.totalIncome)
  const otherIncome =
    split.grossPayments > 0.005
      ? roundMoney(Math.max(0, metrics.totalIncome - grossPayments))
      : 0
  const otherExpenses = otherExpenseTotalFromMap(
    expensesByCategory,
    contractor + motor + purchases
  )

  const core: LodgmentField[] = [
    {
      id: 'MYTAX_GROSS_PAYMENTS',
      label: 'Gross payments (excluding GST)',
      description: 'Primary business income excluding GST (est.).',
      section: 'income',
      amount: grossPayments,
      source: 'auto',
      guide: myTaxFieldGuide('Gross payments (excluding GST)'),
    },
    {
      id: 'MYTAX_OTHER_INCOME',
      label: 'Other business income',
      section: 'income',
      amount: otherIncome,
      source: 'auto',
      guide: myTaxFieldGuide('Other business income'),
    },
    {
      id: 'MYTAX_GOVT_PAYMENTS',
      label: 'Assessable government industry payments',
      description: 'Enter manually if applicable.',
      section: 'income',
      amount: 0,
      source: 'manual',
      guide: myTaxFieldGuide('Assessable government industry payments'),
    },
    {
      id: 'MYTAX_TOTAL_INCOME',
      label: 'Total business income (excluding GST)',
      description:
        'Tax basis for ATO: per-line income ex GST. Not the Biz Intel GST-inclusive cash total.',
      section: 'summary',
      amount: roundMoney(metrics.totalIncome),
      source: 'auto',
      guide: myTaxFieldGuide('Total business income'),
    },
    {
      id: 'MYTAX_OPENING_STOCK',
      label: 'Opening stock',
      description: 'Enter manually from stock records.',
      section: 'expense',
      amount: 0,
      source: 'manual',
      guide: myTaxFieldGuide('Opening stock'),
    },
    {
      id: 'MYTAX_PURCHASES',
      label: 'Purchases and other costs',
      description:
        'Trading stock / inventory only (ex GST est.). Office supplies are under All other expenses.',
      section: 'expense',
      amount: purchases,
      source: 'auto',
      guide: myTaxFieldGuide('Purchases and other costs'),
    },
    {
      id: 'MYTAX_CONTRACTOR',
      label: 'Contractor, sub-contractor and commission payments',
      description:
        'Subcontractor / commission only (ex GST est.). Accounting fees are under All other expenses.',
      section: 'expense',
      amount: contractor,
      source: 'auto',
      guide: myTaxFieldGuide('Contractor, sub-contractor and commission payments'),
    },
    {
      id: 'MYTAX_MOTOR_VEHICLE',
      label: 'Motor vehicle expenses',
      section: 'expense',
      amount: motor,
      source: 'auto',
      guide: myTaxFieldGuide('Motor vehicle expenses'),
    },
    {
      id: 'MYTAX_DEPRECIATION',
      label: 'Depreciation expenses',
      description: 'Enter from your depreciation schedule — not auto-calculated.',
      section: 'expense',
      amount: 0,
      source: 'manual',
      guide: myTaxFieldGuide('Depreciation expenses'),
    },
    {
      id: 'MYTAX_OTHER_EXPENSES',
      label: 'All other expenses',
      description:
        'Remaining P&L expenses excluding GST (est.) — equipment, freight, accounting, office, etc.',
      section: 'expense',
      amount: otherExpenses,
      source: 'auto',
      guide: myTaxFieldGuide('All other expenses'),
    },
    {
      id: 'MYTAX_TOTAL_EXPENSES',
      label: 'Total business expenses (excluding GST)',
      description:
        'Tax basis: per-line ex GST. GST-FREE stays at face. Not Biz Intel cash total.',
      section: 'expense',
      amount: roundMoney(metrics.totalExpenses),
      source: 'auto',
      guide: myTaxFieldGuide('Total business expenses'),
    },
    {
      id: 'MYTAX_NET_INCOME',
      label: 'Net income or loss from business (excluding GST)',
      description:
        'Tax-basis net (ex GST est.). Differs from Biz Intel cash net when 1A ≠ 1B.',
      section: 'summary',
      amount: roundMoney(metrics.netProfit),
      source: 'auto',
      guide: myTaxFieldGuide('Net income or loss from business'),
    },
    {
      id: 'MYTAX_GST_ON_INCOME',
      label: 'GST included in income (information)',
      description: 'Informational — confirm against BAS label 1A for the year.',
      section: 'summary',
      amount: roundMoney(metrics.gstPayable),
      source: 'auto',
      guide: myTaxFieldGuide('GST included in income'),
    },
    {
      id: 'MYTAX_GST_ON_PURCHASES',
      label: 'GST paid on purchases (information)',
      description: 'Informational — confirm against BAS label 1B for the year.',
      section: 'summary',
      amount: roundMoney(metrics.gstClaimable),
      source: 'auto',
      guide: myTaxFieldGuide('GST paid on purchases'),
    },
  ]

  const detail: LodgmentField[] = []
  for (const [cat, amount] of Object.entries(incomeByCategory).sort(
    (a, b) => b[1] - a[1]
  )) {
    if (amount < 0.01) continue
    const display = getCategoryDisplayName(cat)
    detail.push({
      id: `INC_${cat}`,
      label: `Income — ${display}`,
      section: 'income',
      amount: roundMoney(amount),
      source: 'auto',
      guide: myTaxFieldGuide(display),
    })
  }
  for (const [cat, amount] of Object.entries(expensesByCategory).sort(
    (a, b) => b[1] - a[1]
  )) {
    if (amount < 0.01) continue
    const display = getCategoryDisplayName(cat)
    detail.push({
      id: `EXP_${cat}`,
      label: `Expense — ${display}`,
      section: 'expense',
      amount: roundMoney(amount),
      source: 'auto',
      guide: myTaxFieldGuide(display),
    })
  }

  return [...core, ...detail]
}
