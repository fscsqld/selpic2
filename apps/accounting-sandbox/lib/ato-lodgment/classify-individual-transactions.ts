/**
 * Classify bank transactions into personal myTax income/deduction hints.
 * Payment summaries remain authoritative for salary and tax withheld — bank data is advisory.
 */

import type { IndividualBankHints } from './types'

export interface IndividualTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function descUpper(tx: IndividualTransaction): string {
  return (tx.description || '').toUpperCase()
}

function isInternalTransfer(tx: IndividualTransaction): boolean {
  return tx.category === 'TRANSFER_INTERNAL' || tx.category === 'NON_TAXABLE_TRANSFER'
}

function isRefund(tx: IndividualTransaction): boolean {
  return (
    tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
    (descUpper(tx).includes('REFUND') && !!tx.credit)
  )
}

const SALARY_PATTERNS = [
  'SALARY',
  'PAYROLL',
  'WAGES',
  'PAY RUN',
  'EMPLOYER',
  'PAYG PAYMENT',
  'DIRECT CREDIT SALARY',
]

const INTEREST_PATTERNS = ['INTEREST', 'INT CREDIT', 'INT. CREDIT', 'CREDIT INTEREST']

const DIVIDEND_PATTERNS = ['DIVIDEND', 'DIVIDEND PAYMENT', 'FRANKED', 'UNFRANKED']

const GOVT_PATTERNS = [
  'CENTRELINK',
  'SERVICES AUSTRALIA',
  'GOVT',
  'GOVERNMENT',
  'MEDICARE BENEFIT',
  'JOBKEEPER',
  'JOBMAKER',
]

const GIFT_PATTERNS = ['DONATION', 'CHARITY', 'RED CROSS', 'UNICEF', 'WWF']

const WORK_EXPENSE_CATEGORIES = new Set([
  'EXPENSE_TRAVEL_TRANSPORT',
  'EXPENSE_TRAVEL_ACCOMMODATION',
  'EXPENSE_TRAVEL_MEALS',
  'EXPENSE_TRAVEL_PARKING_TOLLS',
  'EXPENSE_FUEL_TRAVEL',
  'EXPENSE_MOTOR_VEHICLE',
  'EXPENSE_OFFICE_SUPPLIES',
  'EXPENSE_OFFICE_EQUIPMENT',
  'EXPENSE_UTILITIES_PHONE',
  'EXPENSE_INSURANCE_PROFESSIONAL',
  'EXPENSE_REPAIRS_MAINTENANCE',
  'EXPENSE_CLEANING_SUPPLIES',
  'EXPENSE_MARKETING',
])

const NON_DEDUCTIBLE_CATEGORIES = new Set([
  'EXPENSE_MEALS_ENTERTAINMENT',
  'EXPENSE_ATO_GST_BAS',
  'EXPENSE_ATO_PAYG_WITHHOLDING',
  'EXPENSE_COMPANY_INCOME_TAX',
  'EXPENSE_SUPERANNUATION',
  'EXPENSE_WAGES_SALARIES',
  'EXPENSE_DIRECTORS_FEES',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'LIABILITY_DIRECTORS_LOAN',
])

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p))
}

function isBusinessIncomeCategory(category?: string): boolean {
  if (!category) return false
  return category.startsWith('INCOME_') && category !== 'INCOME_REFUND_REIMBURSEMENT'
}

/**
 * Aggregate personal tax hints from transactions in a date range.
 */
export function classifyIndividualTransactions(
  transactions: IndividualTransaction[]
): IndividualBankHints {
  const hints: IndividualBankHints = {
    salaryDeposits: 0,
    interest: 0,
    dividends: 0,
    govtPayments: 0,
    businessIncome: 0,
    otherIncome: 0,
    workDeductions: 0,
    giftsDonations: 0,
    taxAffairs: 0,
    otherDeductions: 0,
    paygWithheldHint: 0,
  }

  for (const tx of transactions) {
    if (isInternalTransfer(tx)) continue

    const desc = descUpper(tx)
    const category = tx.category || ''

    if (tx.credit && !isRefund(tx)) {
      if (matchesAny(desc, SALARY_PATTERNS)) {
        hints.salaryDeposits += Math.abs(tx.credit)
      } else if (matchesAny(desc, INTEREST_PATTERNS)) {
        hints.interest += Math.abs(tx.credit)
      } else if (matchesAny(desc, DIVIDEND_PATTERNS)) {
        hints.dividends += Math.abs(tx.credit)
      } else if (matchesAny(desc, GOVT_PATTERNS)) {
        hints.govtPayments += Math.abs(tx.credit)
      } else if (isBusinessIncomeCategory(category)) {
        hints.businessIncome += Math.abs(tx.credit)
      } else {
        hints.otherIncome += Math.abs(tx.credit)
      }
      continue
    }

    if (tx.debit) {
      const amount = Math.abs(tx.debit)

      if (category === 'EXPENSE_ATO_PAYG_WITHHOLDING' || desc.includes('ATO PAYG')) {
        hints.paygWithheldHint += amount
        continue
      }

      if (category === 'EXPENSE_ACCOUNTING_FEES') {
        hints.taxAffairs += amount
        continue
      }

      if (matchesAny(desc, GIFT_PATTERNS)) {
        hints.giftsDonations += amount
        continue
      }

      if (WORK_EXPENSE_CATEGORIES.has(category)) {
        hints.workDeductions += amount
        continue
      }

      if (NON_DEDUCTIBLE_CATEGORIES.has(category)) {
        continue
      }

      if (category.startsWith('EXPENSE_')) {
        hints.otherDeductions += amount
      } else if (!category || category === 'UNCATEGORIZED') {
        hints.otherDeductions += amount
      }
    }
  }

  for (const key of Object.keys(hints) as (keyof IndividualBankHints)[]) {
    hints[key] = roundMoney(hints[key])
  }

  return hints
}

export function countUncategorisedIndividual(
  transactions: IndividualTransaction[]
): number {
  let count = 0
  for (const tx of transactions) {
    if (isInternalTransfer(tx)) continue
    if (!tx.category || tx.category === 'UNCATEGORIZED') count++
  }
  return count
}
