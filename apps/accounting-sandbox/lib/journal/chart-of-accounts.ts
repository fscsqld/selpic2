/**
 * Chart of accounts helpers — classification for ledger-integrated reports.
 */

import type { TrialBalanceAccountType } from '@/lib/utils/trial-balance'

export const COA = {
  CASH: 'ASSET_CASH',
  ACCOUNTS_RECEIVABLE: 'ASSET_ACCOUNTS_RECEIVABLE',
  ACCOUNTS_PAYABLE: 'LIABILITY_ACCOUNTS_PAYABLE',
  DIRECTORS_LOAN: 'LIABILITY_DIRECTORS_LOAN',
  GST_PAYABLE: 'LIABILITY_GST_PAYABLE',
  PAYG_WITHHOLDING: 'LIABILITY_PAYG_WITHHOLDING',
  DEFAULT_SALES: 'INCOME_SALES_CLEANING',
  DEFAULT_EXPENSE: 'EXPENSE_OFFICE_SUPPLIES',
} as const

const LIABILITY_PREFIXES = ['LIABILITY_']
const EQUITY_PREFIXES = ['EQUITY_']
const INCOME_PREFIXES = ['INCOME_']
const EXPENSE_PREFIXES = ['EXPENSE_']
const ASSET_PREFIXES = ['ASSET_']

export function classifyAccount(account: string): TrialBalanceAccountType {
  const code = account.trim().toUpperCase()
  if (ASSET_PREFIXES.some((p) => code.startsWith(p))) return 'Asset'
  if (LIABILITY_PREFIXES.some((p) => code.startsWith(p))) return 'Liability'
  if (EQUITY_PREFIXES.some((p) => code.startsWith(p))) return 'Equity'
  if (INCOME_PREFIXES.some((p) => code.startsWith(p))) return 'Revenue'
  if (EXPENSE_PREFIXES.some((p) => code.startsWith(p))) return 'Expense'
  return 'Expense'
}

/** Normal balance side for presentation (debit-normal vs credit-normal). */
export function isDebitNormalAccount(account: string): boolean {
  const type = classifyAccount(account)
  return type === 'Asset' || type === 'Expense'
}

export function accountDisplayLabel(account: string): string {
  if (account === COA.CASH) return 'Cash & Bank'
  if (account === COA.ACCOUNTS_RECEIVABLE) return 'Accounts Receivable'
  if (account === COA.ACCOUNTS_PAYABLE) return 'Accounts Payable'
  if (account === COA.DIRECTORS_LOAN) return "Director's Loan"
  if (account === COA.GST_PAYABLE) return 'GST Payable'
  if (account === COA.PAYG_WITHHOLDING) return 'PAYG Withholding Payable'
  return account
}
