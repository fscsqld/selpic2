/**
 * Financial Summary Calculator
 * 
 * Calculates financial metrics from transactions
 */

import { calculateGST, hasGST } from '../excel-export'

export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  totalGSTPayable: number
  totalGSTClaimable: number
  directorsLoanBalance: number
  // Deprecated: Department breakdown removed - all business activities consolidated
  cleaningIncome: number
  stickerIncome: number
  cleaningExpenses: number
  stickerExpenses: number
}

export interface Transaction {
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
}

/**
 * Calculate financial summary from transactions
 */
export function calculateFinancialSummary(
  transactions: Transaction[]
): FinancialSummary {
  let totalIncome = 0
  let totalExpenses = 0
  let totalGSTPayable = 0
  let totalGSTClaimable = 0
  let directorsLoanBalance = 0
  // Deprecated: Keep for backward compatibility but calculate as total business
  let cleaningIncome = 0
  let stickerIncome = 0
  let cleaningExpenses = 0
  let stickerExpenses = 0

  for (const tx of transactions) {
    const amount = tx.debit || tx.credit || 0
    const absAmount = Math.abs(amount)

    // Director's Loan tracking
    // Includes: Explicit Director's Loan transactions + Personal (Non-Deductible) transactions
    
    // 1. Explicit Director's Loan transactions
    if (tx.isDirectorsLoan || tx.category === 'LIABILITY_DIRECTORS_LOAN') {
      if (tx.credit) {
        directorsLoanBalance += tx.credit // Capital injection - Director puts money in
      } else if (tx.debit) {
        directorsLoanBalance -= tx.debit // Withdrawal - Director takes money out
      }
    }
    
    // 2. Personal (Non-Deductible) transactions automatically sync to Director's Loan
    // Personal debit = Company pays for Director's personal expenses (Director owes Company)
    // Personal credit = Director deposits personal money (Company owes Director)
    if (tx.department === 'personal') {
      if (tx.credit) {
        // Personal credit = Director deposits money → Company owes Director (balance increases)
        directorsLoanBalance += tx.credit
      } else if (tx.debit) {
        // Personal debit = Director's personal expense paid by Company → Director owes Company (balance decreases)
        directorsLoanBalance -= tx.debit
      }
    }

    // Skip personal (non-deductible) transactions
    const isBusinessTransaction = tx.department !== 'personal' && 
                                  tx.department !== 'unknown' &&
                                  (tx.department === 'cleaning' || 
                                   tx.department === 'sticker' || 
                                   !tx.department) // Include transactions without department as business

    // Income: All business income (exclude non-taxable deposits and transfers)
    if (tx.credit && 
        tx.category?.startsWith('INCOME_') &&
        isBusinessTransaction &&
        tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
        tx.category !== 'INCOME_CASH_DEPOSIT_REVIEW') {
      totalIncome += tx.credit
      
      // For backward compatibility: sum all business income
      cleaningIncome += tx.credit // All business income goes to cleaningIncome for compatibility
      stickerIncome = 0 // No separate sticker income
    } 
    // Expenses: All business expenses (exclude personal and non-deductible)
    else if (tx.debit && 
             tx.category?.startsWith('EXPENSE_') &&
             isBusinessTransaction &&
             tx.category !== 'TRANSFER_INTERNAL') {
      totalExpenses += tx.debit
      
      // For backward compatibility: sum all business expenses
      cleaningExpenses += tx.debit // All business expenses go to cleaningExpenses for compatibility
      stickerExpenses = 0 // No separate sticker expenses
    }

    // GST calculations (only for business transactions)
    if (isBusinessTransaction) {
      // GST on income (payable)
      if (tx.credit && tx.category?.startsWith('INCOME_') && hasGST(tx.category)) {
        const gst = calculateGST(tx.credit)
        totalGSTPayable += gst
      }
      // GST on expenses (claimable)
      if (tx.debit && tx.category?.startsWith('EXPENSE_') && hasGST(tx.category)) {
        const gst = calculateGST(tx.debit)
        totalGSTClaimable += gst
      }
    }
  }

  const netProfit = totalIncome - totalExpenses

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    totalGSTPayable,
    totalGSTClaimable,
    directorsLoanBalance,
    cleaningIncome,
    stickerIncome,
    cleaningExpenses,
    stickerExpenses,
  }
}

