/**
 * Business Calculations - Single Source of Truth
 * 
 * Centralized calculation functions for business metrics
 * Ensures consistency across all components
 */

import {
  isCompanyBusinessDepartment,
  type LedgerAccountType,
} from '@/lib/classification/company-account'
import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'
import { sumGstPayableOnSales } from '@/lib/gst/sales-gst'
import { hydrateFundedByDirectorOnLedger } from '@/lib/cash-expense/funded-by-director'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
  /** Cash Expense paid by director — increases company DL liability */
  fundedByDirector?: boolean
  source?: string
  id?: string
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
}

export interface BusinessCalculations {
  /** Bank / cash P&L — GST-inclusive face values */
  totalIncome: number
  totalExpenses: number
  netProfit: number
  /**
   * Tax / CTR-style estimates: income − 1A, expenses − 1B (GST-FREE stays at face).
   * When not GST-registered (or individual), equal to inclusive totals.
   */
  totalIncomeExGst: number
  totalExpensesExGst: number
  netProfitExGst: number
  gstPayable: number
  gstClaimable: number
  taxableExpenses: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  /** EQUITY_SHARE_CAPITAL credits (company/sole trader only) */
  shareCapital: number
}

const NON_PL_EXPENSE_CATEGORIES = new Set([
  'TRANSFER_INTERNAL',
  'LIABILITY_DIRECTORS_LOAN',
  'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
])

/** True when a debit is a P&L business expense (not loan / transfer / reimbursement). */
export function isPlExpenseDebit(
  tx: Transaction,
  accountType: 'individual' | 'company' | 'sole_trader' = 'company'
): boolean {
  if (!tx.debit) return false
  if (accountType === 'individual') {
    return tx.category !== 'TRANSFER_INTERNAL'
  }
  if (tx.department === 'personal') return false
  if (!isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)) {
    return false
  }
  const cat = tx.category || ''
  if (NON_PL_EXPENSE_CATEGORIES.has(cat)) return false
  if (cat.startsWith('EXPENSE_')) return true
  if (cat.startsWith('CASH_EXPENSE_')) return true
  return false
}

export function filterPlExpenseDebits(
  transactions: Transaction[],
  accountType: 'individual' | 'company' | 'sole_trader' = 'company'
): Transaction[] {
  return transactions.filter((tx) => isPlExpenseDebit(tx, accountType))
}

/**
 * P&L Expenses-by-category rollup — same inclusion rules as totalExpenses debits.
 * Does not net vendor refunds into categories (those reduce Total Expenses only);
 * when refunds are $0, category sum === totalExpenses.
 */
export function groupPlExpensesByCategory(
  transactions: Transaction[],
  accountType: 'individual' | 'company' | 'sole_trader' = 'company'
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const tx of filterPlExpenseDebits(transactions, accountType)) {
    const category = tx.category || 'UNCATEGORIZED'
    out[category] = roundMoney((out[category] || 0) + Math.abs(Number(tx.debit) || 0))
  }
  return out
}

export function sumPlExpenseCategories(byCategory: Record<string, number>): number {
  return roundMoney(
    Object.values(byCategory).reduce((sum, n) => sum + (Number(n) || 0), 0)
  )
}

/** Vendor refunds that reduce deductible expenses — not ATO/loan/erroneous credits. */
function isExpenseReducingRefund(tx: Transaction): boolean {
  const cat = tx.category || ''
  if (
    cat === 'NON_TAXABLE_ATO_GST_REFUND' ||
    cat.startsWith('NON_TAXABLE_') ||
    cat === 'LIABILITY_DIRECTORS_LOAN' ||
    cat === 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' ||
    cat === 'TRANSFER_INTERNAL' ||
    cat === 'EQUITY_SHARE_CAPITAL'
  ) {
    return false
  }
  if (cat === 'INCOME_REFUND_REIMBURSEMENT') return true
  const desc = (tx.description || '').toUpperCase()
  if (!tx.credit) return false
  if (desc.includes('ATO')) return false
  if (desc.includes('REFUND')) return true
  if (desc.includes('OFFICEWORKS') && desc.includes('CREDIT')) return true
  return false
}

/**
 * Calculate all business metrics from transactions
 * This is the SINGLE SOURCE OF TRUTH for all calculations
 * 
 * 🔧 PERSONAL TRANSACTIONS ARE COMPLETELY EXCLUDED FROM BUSINESS CALCULATIONS
 * - department === 'personal' → Excluded from all business metrics
 * - Only affects Director's Loan Balance (for company accounts)
 */
export function calculateBusinessMetrics(
  transactions: Transaction[],
  openingDirectorLoanBalance: number = 0,
  accountType: 'individual' | 'company' | 'sole_trader' = 'company',
  priorPeriodDirectorAdvances: number = 0,
  /** When false (not GST-registered), 1A and 1B are both 0. Default true. */
  gstRegistered: boolean = true
): BusinessCalculations {
  // Legacy Cash Expense rows may lack fundedByDirector — heal before DL/P&L.
  transactions = hydrateFundedByDirectorOnLedger(transactions as any[]) as Transaction[]
  // 1. Calculate Total Income
  // ⚠️ IMPORTANT: Individual User mode - include all income (no business filter, no category restriction)
  const totalIncome = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include ALL credit transactions as income
        // Only exclude internal transfers and expense-reducing refunds
        return (
          tx.credit &&
          tx.category !== 'TRANSFER_INTERNAL' &&
          !isExpenseReducingRefund(tx)
        )
      } else {
        // Company/Sole Trader: Exclude personal transactions
        if (tx.department === 'personal') {
          return false
        }

        const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
        
        // Exclude expense-reducing refunds from income (they reduce expenses instead)
        return isBusiness &&
               tx.credit && 
               tx.category?.startsWith('INCOME_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
               tx.category !== 'INCOME_CASH_DEPOSIT_REVIEW' &&
               tx.category !== 'EQUITY_SHARE_CAPITAL' && // Share Capital은 Income이 아님 (Equity)
               !isExpenseReducingRefund(tx)
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  // 2. Calculate Total Expenses (subtract REFUNDS)
  // ⚠️ IMPORTANT: Individual User mode - include all expenses (no business filter, no category restriction)
  const totalDebits = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include ALL debit transactions as expenses
        // Only exclude internal transfers - all other debits are expenses for individual users
        return tx.debit &&
               tx.category !== 'TRANSFER_INTERNAL'
      } else {
        // Company/Sole Trader: Exclude personal transactions
        if (tx.department === 'personal') {
          return false
        }

        const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
        
        return isPlExpenseDebit(tx, accountType)
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
  
  // Vendor refunds (subtract from expenses) — never ATO GST refund / loan / erroneous
  const refunds = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        return tx.credit && isExpenseReducingRefund(tx) && tx.category !== 'TRANSFER_INTERNAL'
      }
      if (tx.department === 'personal') return false
      const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
      return isBusiness && tx.credit && isExpenseReducingRefund(tx)
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  const totalExpenses = totalDebits - refunds

  // 3. Calculate Taxable Expenses (for GST Claimable) - same logic as totalExpenses
  // ⚠️ IMPORTANT: Individual User mode - GST is not applicable, but include all expenses for consistency
  const taxableDebits = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include ALL debit transactions (GST not applicable but for consistency)
        // Only exclude internal transfers
        return tx.debit &&
               tx.category !== 'TRANSFER_INTERNAL'
      } else {
        // Company/Sole Trader: Exclude personal transactions
        // 🔧 CRITICAL: department === 'personal' transactions are COMPLETELY EXCLUDED from GST
        if (tx.department === 'personal') {
          return false
        }

        const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
        
        // GST-free / non-claimable purchases stay in totalExpenses (P&L / income tax)
        // but are excluded from taxableExpenses → 1B
        return isPlExpenseDebit(tx, accountType) && isPurchaseGstClaimable(tx)
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
  
  // Vendor refunds (subtract from taxable expenses) — never ATO GST refund / loan / erroneous
  const taxableRefunds = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        return tx.credit && isExpenseReducingRefund(tx) && tx.category !== 'TRANSFER_INTERNAL'
      }
      if (tx.department === 'personal') return false
      const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
      return isBusiness && tx.credit && isExpenseReducingRefund(tx)
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  const taxableExpenses = taxableDebits - taxableRefunds

  // 4. Calculate Director's Loan Balance (with opening balance + prior-period advances lodged)
  // Prior-period advances = personal spending director paid before current bank reimbursements
  // (already reported to accountant). Reimbursements then reduce this liability.
  // Director-funded Cash Expenses in-window also increase the liability (company owes director).
  let directorsLoanBalance = openingDirectorLoanBalance + priorPeriodDirectorAdvances
  
  for (const tx of transactions) {
    const cat = tx.category || ''
    // 1. Explicit Director's Loan transactions (injection / withdrawal)
    if (
      cat === 'LIABILITY_DIRECTORS_LOAN' ||
      cat === 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' ||
      tx.isDirectorsLoan
    ) {
      if (tx.credit) {
        directorsLoanBalance += Math.abs(tx.credit) // Loan injection
      } else if (tx.debit) {
        directorsLoanBalance -= Math.abs(tx.debit) // Loan withdrawal
      }
    }
    
    // 2. Director loan repayment / prior-period reimbursement (balance sheet only)
    if (
      cat === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' ||
      cat === 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT'
    ) {
      if (tx.debit) {
        directorsLoanBalance -= Math.abs(tx.debit)
      } else if (tx.credit) {
        directorsLoanBalance += Math.abs(tx.credit)
      }
    }

    // 3. Director-funded company Cash Expenses (not personal department)
    // Increases what the company owes the director; still a P&L expense above.
    if (
      tx.fundedByDirector &&
      tx.debit &&
      tx.department !== 'personal' &&
      cat !== 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT' &&
      cat !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' &&
      cat !== 'LIABILITY_DIRECTORS_LOAN' &&
      cat !== 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL'
    ) {
      directorsLoanBalance += Math.abs(tx.debit)
    }
    
    // 4. Personal (Non-Deductible) transactions
    // 🔧 CRITICAL: Personal transactions ONLY affect Director's Loan Balance
    // They are COMPLETELY EXCLUDED from business income/expenses/GST calculations above
    if (tx.department === 'personal') {
      if (tx.credit) {
        directorsLoanBalance += Math.abs(tx.credit) // Personal deposit → Company owes Director (or individual's own money)
      } else if (tx.debit) {
        directorsLoanBalance -= Math.abs(tx.debit) // Personal expense → Director owes Company (or individual's own expense)
      }
    }
  }

  // 5. Calculate Personal Spending (Non-Deductible)
  // 🔧 This is for reporting purposes only - personal expenses are NOT included in business calculations
  const personalSpendingNonDeductible = transactions
    .filter(tx => tx.department === 'personal' && tx.debit)
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)

  // 6. Calculate GST — sales respect Manual FREE tags; unregistered → 0/0
  const gstPayable =
    accountType === 'individual'
      ? 0
      : sumGstPayableOnSales(transactions, gstRegistered)
  const gstClaimable =
    !gstRegistered || accountType === 'individual'
      ? 0
      : roundMoney(taxableExpenses / 11)

  // 7. Cash (GST-inclusive) net + tax-style ex-GST estimates
  // Expenses_exGST = total − 1B (not ×10/11) so GST-FREE / non-claimable stay at face.
  const netProfit = roundMoney(totalIncome - totalExpenses)
  const totalIncomeExGst = roundMoney(totalIncome - gstPayable)
  const totalExpensesExGst = roundMoney(totalExpenses - gstClaimable)
  const netProfitExGst = roundMoney(totalIncomeExGst - totalExpensesExGst)

  // 8. Calculate Share Capital (Equity - Net Profit에 영향 없음)
  // Share Capital은 Balance Sheet의 Equity 섹션에만 반영
  const shareCapital = transactions
    .filter(tx => {
      // Share Capital은 Credit (입금)만 해당
      // Department는 business여야 함 (personal이면 Director's Loan)
      if (accountType === 'individual') {
        return false // Individual users don't have Share Capital
      }
      
      // Company/Sole Trader: Exclude personal transactions
      if (tx.department === 'personal') {
        return false
      }

      const isBusiness = isCompanyBusinessDepartment(tx.department, accountType as LedgerAccountType)
      
      return isBusiness &&
             tx.credit &&
             tx.category === 'EQUITY_SHARE_CAPITAL'
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    totalIncomeExGst,
    totalExpensesExGst,
    netProfitExGst,
    gstPayable,
    gstClaimable,
    taxableExpenses,
    directorsLoanBalance,
    personalSpendingNonDeductible,
    shareCapital
  }
}

