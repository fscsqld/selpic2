/**
 * Corporate (company) bank account defaults.
 * Company statements are business-only for tax reporting.
 */

export type LedgerAccountType = 'individual' | 'company' | 'sole_trader'

export function isCorporateBankAccount(accountType: LedgerAccountType): boolean {
  return accountType === 'company'
}

/** Default department for uncategorised company ledger rows */
export function defaultCompanyDepartment(
  accountType: LedgerAccountType
): 'personal' | 'cleaning' | 'general' {
  if (accountType === 'individual') return 'personal'
  if (accountType === 'company') return 'cleaning'
  return 'general'
}

/**
 * Whether a transaction counts toward company business metrics.
 * Company accounts: all rows except explicit personal/unknown are business.
 */
export function isCompanyBusinessDepartment(
  department: string | undefined,
  accountType: LedgerAccountType
): boolean {
  if (accountType === 'individual') return true
  if (department === 'personal' || department === 'unknown') return false
  if (accountType === 'company') return true
  // Sole trader — legacy mixed-use rules
  return (
    department === 'cleaning' ||
    department === 'sticker' ||
    department === 'general' ||
    !department
  )
}

export function normalizeCorporateTransactions<T extends { department?: string | null }>(
  transactions: T[],
  accountType: LedgerAccountType
): T[] {
  if (!isCorporateBankAccount(accountType)) return transactions
  return transactions.map((tx) => ({
    ...tx,
    department: tx.department || defaultCompanyDepartment(accountType),
  }))
}
