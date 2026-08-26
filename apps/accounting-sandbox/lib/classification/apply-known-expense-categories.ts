/**
 * Re-apply known categories for legacy Uncategorized bank rows on load.
 */

import { detectFuelRetailer } from '@/lib/classification/australian-fuel-retailers'
import { detectShippingProvider } from '@/lib/classification/australian-shipping-providers'
import { detectPlatformTransaction } from '@/lib/classification/platform-marketplace'
import { detectSelpicCompanyRule } from '@/lib/classification/selpic-company-rules'
import { loadDirectorNameFromStorage } from '@/lib/classification/director-name-match'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'

type Tx = {
  description?: string
  debit?: number | null
  credit?: number | null
  category?: string
  department?: string
  confidence?: number | string
  date?: string
}

/** Legacy categories we overwrite when a stronger company rule matches. */
const OVERRIDEABLE_MISCLASSIFICATIONS = new Set([
  'INCOME_REFUND_REIMBURSEMENT',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'EXPENSE_MERCHANT_FEES', // e.g. Google Australia → Software
  'EXPENSE_CLEANING_SUPPLIES', // e.g. Oomenrgy OCR → Fuel
  'EXPENSE_ATO_GST_BAS', // ATO I002 refund mis-filed as expense
  'EXPENSE_OFFICE_SUPPLIES', // e.g. Nab Intnl Tran Fee mis-filed as office
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT', // e.g. Initial capital mis-filed as reimbursement
  'UNCATEGORIZED',
])

const STRONG_OVERRIDE_CATEGORIES = new Set([
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT',
  'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN',
  'NON_TAXABLE_ATO_GST_REFUND',
  'LIABILITY_DIRECTORS_LOAN',
  'EQUITY_SHARE_CAPITAL',
  'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
  'EXPENSE_FREIGHT_SHIPPING',
  'EXPENSE_CLEANING_SUBCONTRACTOR',
  'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES',
  'EXPENSE_MARKETING',
  'EXPENSE_OFFICE_SUPPLIES',
  'EXPENSE_BANK_FEES_INTEREST',
  'EXPENSE_FUEL_TRAVEL',
  'INCOME_SALES_CLEANING',
])

export function applyKnownExpenseCategoriesIfMissing<T extends Tx>(
  transactions: T[],
  directorName?: string | null
): T[] {
  const dateRepaired = repairUsMisparsedAustralianDates(transactions)

  const resolvedDirector =
    directorName !== undefined && directorName !== null
      ? directorName
      : loadDirectorNameFromStorage()

  return dateRepaired.map((tx) => {
    const company = detectSelpicCompanyRule(
      tx.description || '',
      tx.debit,
      tx.credit,
      resolvedDirector
    )

    const canOverride =
      !tx.category ||
      tx.category === 'UNCATEGORIZED' ||
      (company &&
        STRONG_OVERRIDE_CATEGORIES.has(company.category) &&
        OVERRIDEABLE_MISCLASSIFICATIONS.has(tx.category || ''))

    if (company && canOverride && tx.category !== company.category) {
      const swapped =
        company.swapDebitToCredit && tx.debit
          ? { ...tx, credit: tx.debit, debit: null }
          : tx
      return {
        ...swapped,
        category: company.category,
        department: company.department,
        confidence: company.confidence,
        ...(company.isDirectorsLoan ? { isDirectorsLoan: true } : {}),
      }
    }

    // Category already correct but debit/credit still wrong (ATO refund, director loan)
    if (
      company?.swapDebitToCredit &&
      tx.debit &&
      (tx.category === company.category ||
        (STRONG_OVERRIDE_CATEGORIES.has(company.category) &&
          OVERRIDEABLE_MISCLASSIFICATIONS.has(tx.category || '')))
    ) {
      if (tx.category === company.category) {
        return { ...tx, credit: tx.debit, debit: null }
      }
    }

    // Fuel retailer wins over wrong Cleaning Supplies (Oomenrgy OCR etc.)
    if (
      tx.category === 'EXPENSE_CLEANING_SUPPLIES' &&
      tx.debit &&
      !(tx.credit && Math.abs(tx.credit) > 0)
    ) {
      const fuel = detectFuelRetailer(tx.description || '')
      if (fuel) {
        return {
          ...tx,
          category: fuel.category,
          department: fuel.department,
          confidence: fuel.confidence,
        }
      }
    }

    if (tx.category && tx.category !== 'UNCATEGORIZED') return tx

    if (company) {
      const swapped =
        company.swapDebitToCredit && tx.debit
          ? { ...tx, credit: tx.debit, debit: null }
          : tx
      return {
        ...swapped,
        category: company.category,
        department: company.department,
        confidence: company.confidence,
        ...(company.isDirectorsLoan ? { isDirectorsLoan: true } : {}),
      }
    }

    const platform = detectPlatformTransaction(tx.description || '', tx.debit, tx.credit)
    if (platform) {
      return {
        ...tx,
        category: platform.category,
        department: platform.department,
        confidence: platform.confidence,
      }
    }

    if (!tx.debit || (tx.credit && Math.abs(tx.credit) > 0)) return tx

    const shipping = detectShippingProvider(tx.description || '')
    if (shipping) {
      return {
        ...tx,
        category: shipping.category,
        department: shipping.department,
        confidence: shipping.confidence,
      }
    }

    const fuel = detectFuelRetailer(tx.description || '')
    if (fuel) {
      return {
        ...tx,
        category: fuel.category,
        department: fuel.department,
        confidence: fuel.confidence,
      }
    }

    return tx
  })
}
