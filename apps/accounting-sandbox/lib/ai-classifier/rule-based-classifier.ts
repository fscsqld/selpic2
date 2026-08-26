/**
 * Server-side rule-based transaction classification (no OpenAI).
 * Used for CSV/PDF import when classificationMode is rules_only.
 */

import type { BankTransaction } from '@/lib/pdf-parser/types'
import { detectErroneousPayment } from '@/lib/classification/erroneous-payment'
import { isBankAdvisoryNotice } from '@/lib/classification/bank-advisory'
import { defaultCompanyDepartment } from '@/lib/classification/company-account'
import { detectFuelRetailer } from '@/lib/classification/australian-fuel-retailers'
import { detectShippingProvider } from '@/lib/classification/australian-shipping-providers'
import { detectSelpicCompanyRule } from '@/lib/classification/selpic-company-rules'
import { detectPlatformTransaction } from '@/lib/classification/platform-marketplace'
import {
  descriptionsMatch,
  normalizeDescription,
  type UserMapping,
} from '@/lib/storage/user-mappings'

export type RulesAccountType = 'individual' | 'company' | 'sole_trader'

export interface RuleClassificationResult {
  category: string
  confidence: number
  reason: string
  department?: string
}

interface PatternRule {
  patterns: string[]
  category: string
  department?: string
  creditOnly?: boolean
  debitOnly?: boolean
}

const TRANSFER_PATTERNS = [
  'TRANSFER',
  'TFR',
  'INTERNAL',
  'BPAY TRANSFER',
  'OSKO',
  'PAY ANYONE',
]

const INDIVIDUAL_INCOME_RULES: PatternRule[] = [
  { patterns: ['SALARY', 'PAYROLL', 'WAGES', 'PAY RUN', 'EMPLOYER'], category: 'INCOME_OTHER', creditOnly: true },
  { patterns: ['INTEREST', 'INT CREDIT', 'CREDIT INTEREST'], category: 'INCOME_OTHER', creditOnly: true },
  { patterns: ['DIVIDEND', 'FRANKED', 'UNFRANKED'], category: 'INCOME_OTHER', creditOnly: true },
  { patterns: ['CENTRELINK', 'SERVICES AUSTRALIA', 'JOBKEEPER', 'JOBMAKER'], category: 'INCOME_OTHER', creditOnly: true },
  { patterns: ['REFUND'], category: 'INCOME_REFUND_REIMBURSEMENT', creditOnly: true },
]

const INDIVIDUAL_EXPENSE_RULES: PatternRule[] = [
  { patterns: ['DONATION', 'CHARITY', 'RED CROSS', 'UNICEF'], category: 'EXPENSE_OTHER', debitOnly: true },
  { patterns: ['TAX AGENT', 'ACCOUNTANT', 'ACCOUNTING'], category: 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES', debitOnly: true },
  { patterns: ['BP ', 'SHELL', 'CALTEX', 'AMPOL', 'PETROL', 'FUEL', '7-ELEVEN', '7ELEVEN', '7 ELEVEN', 'LIBERTY', 'UNITED', 'MOBIL', 'GULL', 'METRO PETROLEUM', 'PUMA', 'OOMENRGY', 'OOMENERGY', 'OOM ENERGY'], category: 'EXPENSE_FUEL_TRAVEL', debitOnly: true },
  { patterns: ['UBER', 'TAXI', 'OPAL', 'MYKI'], category: 'EXPENSE_TRAVEL_TRANSPORT', debitOnly: true },
]

const BUSINESS_INCOME_RULES: PatternRule[] = [
  { patterns: ['ATO', 'ACTIVITY STATEMENT', 'BAS'], category: 'NON_TAXABLE_ATO_GST_REFUND', creditOnly: true, department: 'general' },
  { patterns: ['STRIPE', 'SQUARE', 'PAYPAL', 'SHOPIFY'], category: 'INCOME_SALES_CLEANING', creditOnly: true },
  { patterns: ['ETSY', 'EBAY', 'E-BAY', 'E BAY'], category: 'INCOME_SALES_CLEANING', creditOnly: true },
  { patterns: ['INT CREDIT', 'INTEREST CREDIT', 'CREDIT INTEREST', 'BANK INTEREST'], category: 'INCOME_OTHER_BUSINESS', creditOnly: true },
  { patterns: ['INVOICE', 'PAYMENT RECEIVED'], category: 'INCOME_SALES_CLEANING', creditOnly: true },
  { patterns: ['REFUND'], category: 'INCOME_REFUND_REIMBURSEMENT', creditOnly: true },
]

const BUSINESS_EXPENSE_RULES: PatternRule[] = [
  { patterns: ['OFFICEWORKS', 'STAPLES'], category: 'EXPENSE_OFFICE_SUPPLIES', debitOnly: true },
  { patterns: ['BUNNINGS'], category: 'EXPENSE_REPAIRS_MAINTENANCE', debitOnly: true },
  { patterns: ['CRAZYDOMAINS', 'CRAZY DOMAINS', 'CRAZYDOMAIN', 'WEBSITE HO'], category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS', debitOnly: true },
  { patterns: ['HANAONE EXPRESS', 'HANAONE', 'HANA ONE'], category: 'EXPENSE_FREIGHT_SHIPPING', debitOnly: true },
  {
    patterns: [
      'AUSTRALIA POST',
      'AUS POST',
      'AUSPOST',
      'PARCEL POST',
      'EPARCEL',
      'MYPOST',
      'STARTRACK',
      'STAR TRACK',
      'SENDLE',
      'ARAMEX',
      'COURIERS PLEASE',
      'FASTWAY',
      'TNT ',
      'DHL ',
      'FEDEX',
      'UPS ',
      'TOLL ',
      'BORDER EXPRESS',
      'PACK & SEND',
    ],
    category: 'EXPENSE_FREIGHT_SHIPPING',
    debitOnly: true,
  },
  { patterns: ['STRIPE', 'ETSY', 'EBAY', 'E-BAY', 'E BAY', 'PAYPAL', 'SQUARE', 'SHOPIFY'], category: 'EXPENSE_MERCHANT_FEES', debitOnly: true },
  {
    patterns: [
      'CURSOR',
      'GOOGLE WORKSPACE',
      'GOOGLE CLOUD',
      'GOOGLE ONE',
      'GSUITE',
      'G SUITE',
      'MICROSOFT 365',
      'OFFICE 365',
      'ADOBE',
      'OPENAI',
      'GITHUB',
      'NOTION',
      'XERO',
      'MYOB',
    ],
    category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
    debitOnly: true,
  },
  { patterns: [
      'BANK FEE',
      'ACCOUNT FEE',
      'MONTHLY FEE',
      'OVERDRAFT INTEREST',
      'DEBIT INTEREST',
      'INTEREST CHARGE',
      // NAB / card international fees (e.g. "Nab Intnl Tran Fee")
      'INTNL TRAN FEE',
      'INTNL TXN',
      'INTL TXN FEE',
      'INTERNATIONAL TRANSACTION FEE',
      'FOREIGN CURRENCY FEE',
      'FOREIGN TRANSACTION FEE',
      'CURRENCY CONVERSION FEE',
      'OVERSEAS TRANSACTION FEE',
      'CROSS BORDER FEE',
      'NAB INTNL',
    ], category: 'EXPENSE_BANK_FEES_INTEREST', debitOnly: true },
  { patterns: ['GOOGLE ADS', 'ADWORDS', 'GOOGLEAD', 'FACEBOOK ADS', 'META ADS'], category: 'EXPENSE_MARKETING', debitOnly: true },
  { patterns: ['BP ', 'SHELL', 'CALTEX', 'AMPOL', 'PETROL', 'FUEL', '7-ELEVEN', '7ELEVEN', '7 ELEVEN', 'LIBERTY', 'UNITED', 'MOBIL', 'GULL', 'METRO PETROLEUM', 'PUMA', 'OOMENRGY', 'OOMENERGY', 'OOM ENERGY'], category: 'EXPENSE_FUEL_TRAVEL', debitOnly: true },
  { patterns: ['TELSTRA', 'OPTUS', 'VODAFONE'], category: 'EXPENSE_UTILITIES_PHONE', debitOnly: true },
  { patterns: ['ATO', 'ACTIVITY STATEMENT', 'BAS'], category: 'EXPENSE_ATO_GST_BAS', debitOnly: true },
  { patterns: ['SUPER', 'SUPERANNUATION', 'REST ', 'AUSTRALIAN SUPER'], category: 'EXPENSE_SUPERANNUATION', debitOnly: true },
  { patterns: ['MJR', 'MJR ENTERPRISE', 'MJRENTERPRISE', 'CYC COMPANY', 'FSCS PAYMENT'], category: 'EXPENSE_CLEANING_SUBCONTRACTOR', debitOnly: true },
  { patterns: ['OKTAX'], category: 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES', debitOnly: true },
  { patterns: ['TK MAXX', 'TKMAXX'], category: 'EXPENSE_OFFICE_SUPPLIES', debitOnly: true },
  { patterns: ['VISTAPRINT'], category: 'EXPENSE_MARKETING', debitOnly: true },
  { patterns: ['JASON SELPIC'], category: 'INCOME_SALES_CLEANING', creditOnly: true },
  { patterns: ['WAGE', 'PAYROLL', 'PAY RUN'], category: 'EXPENSE_WAGES_SALARIES', debitOnly: true },
  { patterns: ['INSURANCE'], category: 'EXPENSE_INSURANCE_PROFESSIONAL', debitOnly: true },
  { patterns: ['RENT', 'REAL ESTATE'], category: 'EXPENSE_RENT', debitOnly: true },
]

function descUpper(tx: BankTransaction): string {
  return (tx.description || '').toUpperCase()
}

function matchesRule(tx: BankTransaction, rule: PatternRule): boolean {
  const text = descUpper(tx)
  if (isBankAdvisoryNotice(text)) return false
  const hasCredit = !!(tx.credit && Math.abs(tx.credit) > 0)
  const hasDebit = !!(tx.debit && Math.abs(tx.debit) > 0)
  if (rule.creditOnly && !hasCredit) return false
  if (rule.debitOnly && !hasDebit) return false
  return rule.patterns.some((p) => text.includes(p))
}

function matchUserMapping(
  description: string,
  mappings: UserMapping[]
): UserMapping | null {
  for (const mapping of mappings) {
    if (descriptionsMatch(description, mapping.descriptionPattern, true)) {
      return mapping
    }
  }
  return null
}

function isTransfer(tx: BankTransaction): boolean {
  const text = descUpper(tx)
  return TRANSFER_PATTERNS.some((p) => text.includes(p))
}

export function classifyWithRules(
  tx: BankTransaction,
  accountType: RulesAccountType,
  userMappings: UserMapping[] = [],
  directorName?: string | null
): RuleClassificationResult {
  const mapping = matchUserMapping(tx.description, userMappings)
  if (mapping) {
    return {
      category: mapping.category,
      confidence: 0.95,
      reason: 'Applied saved user mapping',
      department: mapping.department,
    }
  }

  const erroneous = detectErroneousPayment(tx)
  if (erroneous) {
    return {
      category: erroneous.category,
      confidence: erroneous.confidence,
      reason: erroneous.reason,
      department: accountType === 'individual' ? 'personal' : 'cleaning',
    }
  }

  const companyRule = detectSelpicCompanyRule(
    tx.description || '',
    tx.debit,
    tx.credit,
    directorName
  )
  if (companyRule) {
    return {
      category: companyRule.category,
      confidence: companyRule.confidence,
      reason: companyRule.reason,
      department: companyRule.department,
    }
  }

  const platform = detectPlatformTransaction(tx.description || '', tx.debit, tx.credit)
  if (platform) {
    return {
      category: platform.category,
      confidence: platform.confidence,
      reason: platform.reason,
      department: platform.department,
    }
  }

  const fuel = detectFuelRetailer(tx.description || '')
  if (fuel && tx.debit && Math.abs(tx.debit) > 0) {
    return {
      category: fuel.category,
      confidence: fuel.confidence,
      reason: fuel.reason,
      department: fuel.department,
    }
  }

  const shipping = detectShippingProvider(tx.description || '')
  if (shipping && tx.debit && Math.abs(tx.debit) > 0) {
    return {
      category: shipping.category,
      confidence: shipping.confidence,
      reason: shipping.reason,
      department: shipping.department,
    }
  }

  if (isTransfer(tx)) {
    return {
      category: 'NON_TAXABLE_TRANSFER',
      confidence: 0.85,
      reason: 'Transfer pattern — review if internal or taxable',
      department: accountType === 'individual' ? 'personal' : 'general',
    }
  }

  const incomeRules =
    accountType === 'individual' ? INDIVIDUAL_INCOME_RULES : BUSINESS_INCOME_RULES
  const expenseRules =
    accountType === 'individual' ? INDIVIDUAL_EXPENSE_RULES : BUSINESS_EXPENSE_RULES

  for (const rule of incomeRules) {
    if (matchesRule(tx, rule)) {
      return {
        category: rule.category,
        confidence: 0.75,
        reason: `Rule match: ${rule.patterns[0]}`,
        department: rule.department || (accountType === 'individual' ? 'personal' : 'cleaning'),
      }
    }
  }

  for (const rule of expenseRules) {
    if (matchesRule(tx, rule)) {
      return {
        category: rule.category,
        confidence: 0.75,
        reason: `Rule match: ${rule.patterns[0]}`,
        department: rule.department || (accountType === 'individual' ? 'personal' : 'cleaning'),
      }
    }
  }

  return {
    category: 'UNCATEGORIZED',
    confidence: 0,
    reason: 'No rule matched — categorise manually in the transaction table',
    department: defaultCompanyDepartment(accountType),
  }
}

export function buildGstInfoForRules(
  tx: BankTransaction,
  accountType: RulesAccountType,
  category: string
) {
  const amount = Math.abs(tx.debit || tx.credit || 0)
  if (accountType === 'individual') {
    return {
      isGSTIncluded: false,
      gstType: 'FREE' as const,
      gstAmount: 0,
      netAmount: amount,
      confidence: 1,
      reasoning: 'Individual: GST not applicable',
    }
  }
  const gstExpense =
    category.startsWith('EXPENSE_') &&
    !['EXPENSE_ATO_GST_BAS', 'EXPENSE_ATO_PAYG_WITHHOLDING', 'EXPENSE_WAGES_SALARIES'].includes(category)
  if (gstExpense && tx.debit) {
    const desc = String(tx.description || '').toUpperCase()
    const hanaoneFree =
      desc.includes('HANAONE') || desc.includes('HANA ONE')
    if (hanaoneFree) {
      return {
        isGSTIncluded: false,
        gstType: 'FREE' as const,
        gstAmount: 0,
        netAmount: amount,
        confidence: 0.9,
        reasoning: 'Hanaone Express — no AU GST claim (international freight)',
      }
    }
    const gstAmount = Math.round((amount / 11) * 100) / 100
    return {
      isGSTIncluded: true,
      gstType: 'INCLUDED' as const,
      gstAmount,
      netAmount: Math.round((amount - gstAmount) * 100) / 100,
      confidence: 0.5,
      reasoning: 'Estimated GST included — verify before lodging',
    }
  }
  return {
    isGSTIncluded: false,
    gstType: 'FREE' as const,
    gstAmount: 0,
    netAmount: amount,
    confidence: 0.5,
    reasoning: 'GST not estimated — review manually',
  }
}

/** Normalise description for dedupe keys (exported for tests). */
export { normalizeDescription }
