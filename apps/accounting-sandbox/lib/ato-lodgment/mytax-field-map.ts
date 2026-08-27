import { getCategoryDisplayName } from '@/lib/utils/category-display'
import { roundMoney } from '@/lib/utils/currency-format'
import type { LodgmentField } from './types'
import { myTaxFieldGuide } from './field-guides'

/**
 * Totals passed here should already be the basis to lodge (GST-exclusive / tax
 * for ATO Annual & CTR). Optional cash* values scale category buckets onto that
 * basis so section lines still sum to the tax totals.
 */
export interface MyTaxMetricsInput {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
  cashTotalIncome?: number
  cashTotalExpenses?: number
  cashNetProfit?: number
}

export interface MyTaxCategoryInput {
  incomeByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
}

function isContractorExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (
    key.includes('accounting') ||
    key.includes('bookkeep') ||
    key.includes('legal') ||
    key.includes('professional') ||
    key.includes('consult')
  ) {
    return false
  }
  return (
    key.includes('subcontractor') ||
    key.includes('sub_contractor') ||
    key.includes('contractor') ||
    key.includes('commission')
  )
}

/**
 * ATO myTax “Motor vehicle expenses” only — fuel, vehicle, parking, tolls.
 * Business airfare / travel–transport (e.g. EXPENSE_TRAVEL_TRANSPORT) must NOT
 * land here; those fall through to All other expenses.
 */
function isMotorExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (
    key.includes('accommodation') ||
    key.includes('hotel') ||
    key.includes('meal') ||
    key.includes('airfare') ||
    key.includes('air_fare') ||
    key.includes('air-fare') ||
    key.includes('flight') ||
    key.includes('airline') ||
    key.includes('air_travel') ||
    key.includes('air-travel') ||
    key.includes('travel_transport') ||
    key.includes('travel-transport') ||
    (key.includes('travel') && key.includes('transport'))
  ) {
    return false
  }
  return (
    key.includes('motor') ||
    key.includes('vehicle') ||
    key.includes('fuel') ||
    (key.includes('car') && !key.includes('care')) ||
    key.includes('parking') ||
    key.includes('toll')
  )
}

function isPurchaseExpenseCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (key.includes('office_supplies') || key.includes('office-supplies')) {
    return false
  }
  if (key.includes('supplies') && key.includes('office')) return false
  return (
    key.includes('inventory') ||
    key.includes('cogs') ||
    key.includes('cost_of_goods') ||
    key.includes('purchases') ||
    key.includes('stock') ||
    (key.includes('supplies') && !key.includes('office'))
  )
}

function sumMatching(
  map: Record<string, number>,
  match: (category: string) => boolean
): number {
  let total = 0
  for (const [cat, amount] of Object.entries(map)) {
    if (match(cat)) total += Math.abs(amount)
  }
  return roundMoney(total)
}

function otherExpenseTotal(map: Record<string, number>, excluded: number): number {
  const total = Object.values(map).reduce((s, v) => s + Math.abs(v), 0)
  return roundMoney(Math.max(0, total - excluded))
}

function scaleMap(map: Record<string, number>, scale: number): Record<string, number> {
  if (!Number.isFinite(scale) || Math.abs(scale - 1) < 0.00001) return map
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(map)) {
    out[k] = roundMoney(Math.abs(v) * scale)
  }
  return out
}

function isPrimarySalesIncomeCategory(category: string): boolean {
  const key = category.toLowerCase()
  if (key.includes('other') || key.includes('interest') || key.includes('gov')) {
    return false
  }
  return (
    key.includes('sales') ||
    key.includes('service') ||
    key.includes('trading') ||
    key.includes('revenue') ||
    key === 'income' ||
    key.endsWith('_income')
  )
}

function splitBusinessIncome(map: Record<string, number>): {
  grossPayments: number
  otherIncome: number
} {
  let gross = 0
  let other = 0
  for (const [cat, amount] of Object.entries(map)) {
    const value = Math.abs(amount)
    if (isPrimarySalesIncomeCategory(cat)) gross += value
    else other += value
  }
  return { grossPayments: roundMoney(gross), otherIncome: roundMoney(other) }
}

/**
 * myTax / Annual worksheet fields for ATO copy-enter.
 * Prefer GST-exclusive (tax) totals from the caller.
 */
export function buildMyTaxAnnualFields(
  metrics: MyTaxMetricsInput,
  categories: MyTaxCategoryInput
): LodgmentField[] {
  const incomeScale =
    metrics.cashTotalIncome && metrics.cashTotalIncome > 0.005
      ? metrics.totalIncome / metrics.cashTotalIncome
      : 1
  const expenseScale =
    metrics.cashTotalExpenses && metrics.cashTotalExpenses > 0.005
      ? metrics.totalExpenses / metrics.cashTotalExpenses
      : 1

  const incomeByCategory = scaleMap(categories.incomeByCategory, incomeScale)
  const expensesByCategory = scaleMap(categories.expensesByCategory, expenseScale)

  const contractor = sumMatching(expensesByCategory, isContractorExpenseCategory)
  const motor = sumMatching(expensesByCategory, isMotorExpenseCategory)
  const purchases = sumMatching(expensesByCategory, isPurchaseExpenseCategory)
  const split = splitBusinessIncome(incomeByCategory)
  const grossPayments =
    split.grossPayments > 0.005
      ? split.grossPayments
      : roundMoney(metrics.totalIncome)
  const otherIncome =
    split.grossPayments > 0.005
      ? roundMoney(Math.max(0, metrics.totalIncome - grossPayments))
      : 0
  const otherExpenses = otherExpenseTotal(
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
        'Tax basis for ATO: cash income − GST on sales (1A). Not the Biz Intel GST-inclusive cash total.',
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
        'Tax basis: cash expenses − claimable GST (1B). GST-FREE stays at face. Not Biz Intel cash total.',
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
