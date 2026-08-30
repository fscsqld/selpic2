/**
 * Map bank-statement categories to GL accounts for Trial Balance / Balance Sheet.
 * Non-P&L items (director loan, ATO GST refund, erroneous payments) must not post
 * as Expense/Revenue.
 */

import { COA } from '@/lib/journal/chart-of-accounts'

/** Categories that must never appear as P&L expense/revenue in the ledger. */
export function resolveLedgerCategoryAccount(
  category: string,
  side: 'debit' | 'credit'
): string {
  const cat = (category || 'UNCATEGORIZED').trim()

  // Opening / period loan injection (credit) or withdrawal (debit)
  if (cat === 'LIABILITY_DIRECTORS_LOAN' || cat === 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL') {
    return COA.DIRECTORS_LOAN
  }

  // Prior-period reimbursement / loan repayment — reduce directors loan liability
  if (
    cat === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT' ||
    cat === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT'
  ) {
    return COA.DIRECTORS_LOAN
  }

  // ATO GST/BAS refund received — cash in, clear GST (not income, not expense)
  if (cat === 'NON_TAXABLE_ATO_GST_REFUND') {
    return COA.GST_PAYABLE
  }

  // Erroneous payment pair — suspense clearing (balance sheet), not P&L
  if (
    cat === 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT' ||
    cat === 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN'
  ) {
    return 'ASSET_SUSPENSE_ERRONEOUS'
  }

  // Debit tagged as Refund/Reimbursement собой is almost always a mis-class
  // (director reimbursement out). Vendor refunds are credits.
  if (cat === 'INCOME_REFUND_REIMBURSEMENT' && side === 'debit') {
    return COA.DIRECTORS_LOAN
  }

  // Transfers / cash deposits — equity/cash excursions, keep as non-PL labels
  if (cat === 'NON_TAXABLE_TRANSFER' || cat === 'TRANSFER_INTERNAL') {
    return 'EQUITY_TRANSFER_CLEARING'
  }
  if (cat === 'NON_TAXABLE_CASH_DEPOSIT') {
    return COA.DIRECTORS_LOAN
  }

  return cat
}
