import { myTaxPersonalFieldGuide } from './field-guides'
import { roundAtoWholeDollars } from '@/lib/utils/ato-lodgment-rounding'
import type { IndividualBankHints } from './types'
import type { LodgmentField, LodgmentValidation } from './types'

/** ATO / myTax labels: whole dollars, leave cents out (do not round up). */
function atoLabel(n: number): number {
  return roundAtoWholeDollars(n)
}

export interface IndividualFieldAmounts {
  salary: number
  interest: number
  dividends: number
  govtPayments: number
  rentalIncome: number
  businessIncome: number
  otherIncome: number
  capitalGains: number
  workDeductions: number
  giftsDonations: number
  taxAffairs: number
  otherDeductions: number
  taxWithheld: number
}

export interface IndividualManualOverrides {
  salary?: number
  interest?: number
  dividends?: number
  govtPayments?: number
  rentalIncome?: number
  businessIncome?: number
  otherIncome?: number
  capitalGains?: number
  workDeductions?: number
  giftsDonations?: number
  taxAffairs?: number
  otherDeductions?: number
  taxWithheld?: number
}

function resolveAmount(
  override: number | undefined,
  hint: number,
  manualDefault: number
): { amount: number; source: 'auto' | 'manual' } {
  if (override !== undefined) {
    return { amount: atoLabel(override), source: override === 0 ? 'manual' : 'auto' }
  }
  if (manualDefault === 0 && hint === 0) {
    return { amount: 0, source: 'manual' }
  }
  return { amount: atoLabel(hint || manualDefault), source: hint > 0 ? 'auto' : 'manual' }
}

/**
 * Build myTax personal return fields for copy-and-enter workflow.
 */
export function buildMyTaxIndividualFields(
  hints: IndividualBankHints,
  overrides: IndividualManualOverrides = {}
): LodgmentField[] {
  const salary = resolveAmount(overrides.salary, hints.salaryDeposits, 0)
  const interest = resolveAmount(overrides.interest, hints.interest, 0)
  const dividends = resolveAmount(overrides.dividends, hints.dividends, 0)
  const govt = resolveAmount(overrides.govtPayments, hints.govtPayments, 0)
  const rental = resolveAmount(overrides.rentalIncome, 0, 0)
  const business = resolveAmount(overrides.businessIncome, hints.businessIncome, 0)
  const otherIncome = resolveAmount(overrides.otherIncome, hints.otherIncome, 0)
  const capitalGains = resolveAmount(overrides.capitalGains, 0, 0)
  const work = resolveAmount(overrides.workDeductions, hints.workDeductions, 0)
  const gifts = resolveAmount(overrides.giftsDonations, hints.giftsDonations, 0)
  const taxAffairs = resolveAmount(overrides.taxAffairs, hints.taxAffairs, 0)
  const otherDed = resolveAmount(overrides.otherDeductions, hints.otherDeductions, 0)
  const withheld = resolveAmount(overrides.taxWithheld, hints.paygWithheldHint, 0)

  const totalIncome = atoLabel(
    salary.amount +
      interest.amount +
      dividends.amount +
      govt.amount +
      rental.amount +
      business.amount +
      otherIncome.amount +
      capitalGains.amount
  )

  const totalDeductions = atoLabel(
    work.amount + gifts.amount + taxAffairs.amount + otherDed.amount
  )

  const taxableIncome = atoLabel(Math.max(0, totalIncome - totalDeductions))

  const incomeFields: LodgmentField[] = [
    {
      id: 'IND_SALARY',
      label: 'Salary and wages',
      myTaxLabel: 'Salary and wages',
      description:
        hints.salaryDeposits > 0
          ? `Bank hint: ${hints.salaryDeposits.toFixed(2)} — use your employer payment summary as the authoritative amount.`
          : 'Enter from your employer income statement / payment summary.',
      section: 'income',
      amount: salary.amount,
      source: 'manual',
      entryKind: 'manual',
      guide: myTaxPersonalFieldGuide('Salary and wages'),
    },
    {
      id: 'IND_INTEREST',
      label: 'Gross interest',
      myTaxLabel: 'Gross interest',
      description: 'Bank interest — confirm against your bank interest statements.',
      section: 'income',
      amount: interest.amount,
      source: interest.source,
      entryKind: hints.interest > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Gross interest'),
    },
    {
      id: 'IND_DIVIDENDS',
      label: 'Dividends',
      myTaxLabel: 'Dividends',
      description: 'Enter franked/unfranked amounts from your dividend statements.',
      section: 'income',
      amount: dividends.amount,
      source: dividends.source,
      entryKind: hints.dividends > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Dividends'),
    },
    {
      id: 'IND_GOVT',
      label: 'Government payments',
      myTaxLabel: 'Government payments and allowances',
      description: 'Centrelink and other government payments — confirm against your income statement.',
      section: 'income',
      amount: govt.amount,
      source: govt.source,
      entryKind: hints.govtPayments > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Government payments and allowances'),
    },
    {
      id: 'IND_RENTAL',
      label: 'Net rental income',
      myTaxLabel: 'Rental schedule — net rent',
      description: 'Enter from your rental property records or tax agent worksheet.',
      section: 'income',
      amount: rental.amount,
      source: 'manual',
      entryKind: 'manual',
      guide: myTaxPersonalFieldGuide('Rental schedule'),
    },
    {
      id: 'IND_BUSINESS',
      label: 'Business income (side income)',
      myTaxLabel: 'Business income or loss',
      description:
        hints.businessIncome > 0
          ? 'Bank hint from business-related credits — use myTax business schedule if registered for ABN.'
          : 'Enter if you have sole trader or business income. Switch to Sole Trader account for full business schedule.',
      section: 'income',
      amount: business.amount,
      source: business.source,
      entryKind: hints.businessIncome > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Business income or loss'),
    },
    {
      id: 'IND_OTHER_INCOME',
      label: 'Other income',
      myTaxLabel: 'Other income',
      description: 'Remaining bank credits not classified elsewhere — review before entering.',
      section: 'income',
      amount: otherIncome.amount,
      source: otherIncome.source,
      entryKind: hints.otherIncome > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Other income'),
    },
    {
      id: 'IND_CAPITAL_GAINS',
      label: 'Net capital gain',
      myTaxLabel: 'Capital gains or losses',
      description: 'Enter from your CGT records — not derived from bank data.',
      section: 'income',
      amount: capitalGains.amount,
      source: 'manual',
      entryKind: 'manual',
      guide: myTaxPersonalFieldGuide('Capital gains or losses'),
    },
    {
      id: 'IND_TOTAL_INCOME',
      label: 'Total income',
      myTaxLabel: 'Total income',
      description: 'Sum of income items above — verify in myTax summary.',
      section: 'summary',
      amount: totalIncome,
      source: 'auto',
      entryKind: 'auto',
      guide: myTaxPersonalFieldGuide('Total income'),
      readOnly: false,
    },
  ]

  const deductionFields: LodgmentField[] = [
    {
      id: 'IND_WORK_DEDUCTIONS',
      label: 'Work-related expenses',
      myTaxLabel: 'Work-related expenses',
      description: 'Travel, phone, tools, uniforms — confirm deductibility before claiming.',
      section: 'expense',
      amount: work.amount,
      source: work.source,
      entryKind: hints.workDeductions > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Work-related expenses'),
    },
    {
      id: 'IND_GIFTS',
      label: 'Gifts or donations',
      myTaxLabel: 'Gifts or donations',
      description: 'Deductible gifts to DGR charities only.',
      section: 'expense',
      amount: gifts.amount,
      source: gifts.source,
      entryKind: hints.giftsDonations > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Gifts or donations'),
    },
    {
      id: 'IND_TAX_AFFAIRS',
      label: 'Cost of managing tax affairs',
      myTaxLabel: 'Cost of managing tax affairs',
      description: 'Accounting and tax agent fees.',
      section: 'expense',
      amount: taxAffairs.amount,
      source: taxAffairs.source,
      entryKind: hints.taxAffairs > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Cost of managing tax affairs'),
    },
    {
      id: 'IND_OTHER_DEDUCTIONS',
      label: 'Other deductions',
      myTaxLabel: 'Other deductions',
      description: 'Remaining deductible expenses — review each item for private use.',
      section: 'expense',
      amount: otherDed.amount,
      source: otherDed.source,
      entryKind: hints.otherDeductions > 0 ? 'review' : 'manual',
      guide: myTaxPersonalFieldGuide('Other deductions'),
    },
    {
      id: 'IND_TOTAL_DEDUCTIONS',
      label: 'Total deductions',
      myTaxLabel: 'Total deductions',
      description: 'Sum of deduction items above.',
      section: 'summary',
      amount: totalDeductions,
      source: 'auto',
      entryKind: 'auto',
      guide: myTaxPersonalFieldGuide('Total deductions'),
    },
  ]

  const taxFields: LodgmentField[] = [
    {
      id: 'IND_TAXABLE_INCOME',
      label: 'Taxable income (estimate)',
      myTaxLabel: 'Taxable income',
      description: 'Simplified: total income minus total deductions. myTax applies further adjustments.',
      section: 'tax',
      amount: taxableIncome,
      source: 'auto',
      entryKind: 'review',
      guide: myTaxPersonalFieldGuide('Taxable income'),
    },
    {
      id: 'IND_TAX_WITHHELD',
      label: 'Tax withheld (PAYG)',
      myTaxLabel: 'Tax withheld',
      description:
        hints.paygWithheldHint > 0
          ? `Bank hint: ${hints.paygWithheldHint.toFixed(2)} — use payment summary total as authoritative.`
          : 'Enter total tax withheld from all payment summaries.',
      section: 'tax',
      amount: withheld.amount,
      source: 'manual',
      entryKind: 'manual',
      guide: myTaxPersonalFieldGuide('Tax withheld'),
    },
  ]

  return [...incomeFields, ...deductionFields, ...taxFields]
}

export function validateIndividualLodgment(
  fields: LodgmentField[],
  uncategorisedCount: number
): LodgmentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (uncategorisedCount > 0) {
    warnings.push(
      `${uncategorisedCount} uncategorised transaction(s) in this year — review before lodging.`
    )
  }

  const totalIncome = fields.find((f) => f.id === 'IND_TOTAL_INCOME')?.amount ?? 0
  const totalDeductions = fields.find((f) => f.id === 'IND_TOTAL_DEDUCTIONS')?.amount ?? 0
  const taxable = fields.find((f) => f.id === 'IND_TAXABLE_INCOME')?.amount ?? 0

  const incomeIds = [
    'IND_SALARY',
    'IND_INTEREST',
    'IND_DIVIDENDS',
    'IND_GOVT',
    'IND_RENTAL',
    'IND_BUSINESS',
    'IND_OTHER_INCOME',
    'IND_CAPITAL_GAINS',
  ]
  const sumIncome = atoLabel(
    incomeIds.reduce((s, id) => s + (fields.find((f) => f.id === id)?.amount ?? 0), 0)
  )

  if (Math.abs(sumIncome - totalIncome) > 0.02) {
    errors.push('Total income does not match the sum of income line items.')
  }

  const dedIds = ['IND_WORK_DEDUCTIONS', 'IND_GIFTS', 'IND_TAX_AFFAIRS', 'IND_OTHER_DEDUCTIONS']
  const sumDed = atoLabel(
    dedIds.reduce((s, id) => s + (fields.find((f) => f.id === id)?.amount ?? 0), 0)
  )
  const totalDedField = fields.find((f) => f.id === 'IND_TOTAL_DEDUCTIONS')?.amount ?? 0

  if (Math.abs(sumDed - totalDedField) > 0.02) {
    errors.push('Total deductions does not match the sum of deduction line items.')
  }

  if (Math.abs(atoLabel(totalIncome - totalDeductions) - taxable) > 0.02) {
    errors.push('Taxable income does not match total income minus deductions.')
  }

  const salary = fields.find((f) => f.id === 'IND_SALARY')?.amount ?? 0
  if (salary === 0 && totalIncome > 0) {
    warnings.push(
      'Salary is zero — if you are an employee, enter amounts from your payment summary.'
    )
  }

  if (totalDeductions > totalIncome) {
    warnings.push('Deductions exceed income — confirm amounts before lodging.')
  }

  return { ok: errors.length === 0, errors, warnings }
}
