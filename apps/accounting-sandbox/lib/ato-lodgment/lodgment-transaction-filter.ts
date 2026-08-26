/**
 * BAS / ATO lodgment uses bank & cash statement activity only.
 * Payroll approval creates accrual journal rows (wages, super, PAYG, net pay)
 * — same exclusion as Reports Trial Balance and Biz Intel Transaction History.
 */

export type LodgmentBankTx = {
  source?: string
  isPayrollTransaction?: boolean
  description?: string
  category?: string
}

export function isPayrollJournalTransaction(tx: LodgmentBankTx): boolean {
  if (tx.source === 'payroll' || tx.isPayrollTransaction) return true
  const desc = (tx.description || '').toUpperCase()
  const cat = tx.category || ''
  if (
    desc.includes('NET PAY -') ||
    desc.includes('PAYG WITHHOLDING -') ||
    desc.includes('SUPERANNUATION -') ||
    (desc.includes('WAGES -') && desc.includes(' TO '))
  ) {
    return true
  }
  if (
    cat === 'LIABILITY_PAYG_WITHHOLDING' ||
    cat === 'LIABILITY_SUPERANNUATION' ||
    cat === 'ASSET_CASH'
  ) {
    return desc.includes('WAGES -') || desc.includes('NET PAY') || desc.includes('PAYG WITHHOLDING')
  }
  return false
}

export function filterBankStatementTransactionsForLodgment<T extends LodgmentBankTx>(
  transactions: T[]
): T[] {
  return transactions.filter((tx) => !isPayrollJournalTransaction(tx))
}
