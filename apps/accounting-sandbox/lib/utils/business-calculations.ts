/**
 * Business Calculations - Single Source of Truth
 * 
 * Centralized calculation functions for business metrics
 * Ensures consistency across all components
 * 
 * 🔧 CRITICAL: Personal Transactions Separation
 * - Transactions with `department: 'personal'` are COMPLETELY EXCLUDED from business calculations
 * - Personal transactions are NOT included in:
 *   - Total Business Income
 *   - Total Business Expenses
 *   - Net Profit
 *   - GST Payable/Claimable
 *   - Taxable Expenses
 * - Personal transactions ONLY affect:
 *   - Director's Loan Balance (for company accounts)
 *   - Personal Spending Non-Deductible (for reporting)
 * 
 * This design supports:
 * - Individual users (personal transactions only)
 * - Company users (business transactions only)
 * - Sole traders (mixed personal + business in same account)
 */

export interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
}

export interface BusinessCalculations {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
  taxableExpenses: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  /** EQUITY_SHARE_CAPITAL credits (company/sole trader only) */
  shareCapital: number
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
  accountType: 'individual' | 'company' | 'sole_trader' = 'company'
): BusinessCalculations {
  // 1. Calculate Total Income
  // ⚠️ IMPORTANT: Individual User mode - include all income (no business filter, no category restriction)
  const totalIncome = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include ALL credit transactions as income
        // Only exclude internal transfers and refunds (refunds reduce expenses, not add to income)
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
        
        // Exclude only internal transfers - all other credits are income for individual users
        return tx.credit && 
               tx.category !== 'TRANSFER_INTERNAL' &&
               !isRefund
      } else {
        // Company/Sole Trader: Exclude personal transactions
        // 🔧 CRITICAL: department === 'personal' transactions are COMPLETELY EXCLUDED
        if (tx.department === 'personal') {
          return false // Personal transactions are completely excluded
        }
        
        // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
        const isBusiness = tx.department !== 'unknown' &&
                          tx.department !== 'general' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
                           !tx.department)
        
        // Exclude REFUNDS from income - they reduce expenses, not add to income
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
        
        return isBusiness &&
               tx.credit && 
               tx.category?.startsWith('INCOME_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
               tx.category !== 'INCOME_CASH_DEPOSIT_REVIEW' &&
               tx.category !== 'EQUITY_SHARE_CAPITAL' && // Share Capital은 Income이 아님 (Equity)
               !isRefund
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
        // 🔧 CRITICAL: department === 'personal' transactions are COMPLETELY EXCLUDED
        if (tx.department === 'personal') {
          return false // Personal transactions are completely excluded
        }
        
        // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
        const isBusiness = tx.department !== 'unknown' &&
                          tx.department !== 'general' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
                           !tx.department)
        
        return isBusiness &&
               tx.debit &&
               tx.category?.startsWith('EXPENSE_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'LIABILITY_DIRECTORS_LOAN' &&
               tx.category !== 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' &&
               tx.category !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT'
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
  
  // Refunds (subtract from expenses)
  const refunds = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include all refunds (any credit that is a refund)
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit) ||
                        (tx.description?.toUpperCase().includes('OFFICEWORKS') && tx.credit && tx.description?.toUpperCase().includes('CREDIT'))
        
        return tx.credit && isRefund && tx.category !== 'TRANSFER_INTERNAL'
      } else {
        // Company/Sole Trader: Business refunds only (personal refunds excluded)
        // 🔧 EXCLUDE personal transactions
        if (tx.department === 'personal') {
          return false
        }
        
        // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
        const isBusiness = tx.department !== 'unknown' &&
                          tx.department !== 'general' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
                           !tx.department)
        
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit) ||
                        (tx.description?.toUpperCase().includes('OFFICEWORKS') && tx.credit)
        
        return isBusiness &&
               tx.credit &&
               isRefund
      }
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
          return false // Personal transactions are completely excluded
        }
        
        // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
        const isBusiness = tx.department !== 'unknown' &&
                          tx.department !== 'general' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
                           !tx.department)
        
        return isBusiness &&
               tx.debit &&
               tx.category?.startsWith('EXPENSE_') &&
               tx.category !== 'TRANSFER_INTERNAL' &&
               tx.category !== 'LIABILITY_DIRECTORS_LOAN' &&
               tx.category !== 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' &&
               tx.category !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' // Director Loan Repayment does NOT contribute to GST
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
  
  // Refunds (subtract from taxable expenses)
  const taxableRefunds = transactions
    .filter(tx => {
      if (accountType === 'individual') {
        // Individual User: Include all refunds (any credit that is a refund)
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit) ||
                        (tx.description?.toUpperCase().includes('OFFICEWORKS') && tx.credit && tx.description?.toUpperCase().includes('CREDIT'))
        
        return tx.credit && isRefund && tx.category !== 'TRANSFER_INTERNAL'
      } else {
        // Company/Sole Trader: Business refunds only (personal refunds excluded)
        // 🔧 EXCLUDE personal transactions
        if (tx.department === 'personal') {
          return false
        }
        
        // Unified: 'cleaning' and 'sticker' are both treated as 'Company' (business)
        const isBusiness = tx.department !== 'unknown' &&
                          tx.department !== 'general' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || // Legacy support: auto-convert to 'cleaning'
                           !tx.department)
        
        const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                        (tx.description?.toUpperCase().includes('REFUND') && tx.credit) ||
                        (tx.description?.toUpperCase().includes('OFFICEWORKS') && tx.credit)
        
        return isBusiness &&
               tx.credit &&
               isRefund
      }
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  const taxableExpenses = taxableDebits - taxableRefunds

  // 4. Calculate Director's Loan Balance (with opening balance)
  // 🔧 NOTE: This is ONLY relevant for company accounts with mixed personal/business transactions
  // For individual users or pure business accounts, this may not be applicable
  let directorsLoanBalance = openingDirectorLoanBalance
  
  for (const tx of transactions) {
    // 1. Explicit Director's Loan transactions
    if (tx.category === 'LIABILITY_DIRECTORS_LOAN' || tx.isDirectorsLoan) {
      if (tx.credit) {
        directorsLoanBalance += Math.abs(tx.credit) // Loan injection
      } else if (tx.debit) {
        directorsLoanBalance -= Math.abs(tx.debit) // Loan withdrawal
      }
    }
    
    // 2. Director Loan Repayment (EXPENSE_DIRECTOR_LOAN_REPAYMENT category)
    if (tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT') {
      if (tx.debit) {
        directorsLoanBalance -= Math.abs(tx.debit) // Repayment reduces balance
      } else if (tx.credit) {
        directorsLoanBalance += Math.abs(tx.credit) // Shouldn't happen, but handle it
      }
    }
    
    // 3. Personal (Non-Deductible) transactions
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

  // 6. Calculate GST
  const gstPayable = totalIncome / 11
  const gstClaimable = taxableExpenses / 11

  // 7. Calculate Net Profit
  const netProfit = totalIncome - totalExpenses

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
      
      const isBusiness = tx.department !== 'unknown' &&
                        tx.department !== 'general' &&
                        (tx.department === 'cleaning' || 
                         tx.department === 'sticker' || 
                         !tx.department)
      
      return isBusiness &&
             tx.credit &&
             tx.category === 'EQUITY_SHARE_CAPITAL'
    })
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    gstPayable,
    gstClaimable,
    taxableExpenses,
    directorsLoanBalance,
    personalSpendingNonDeductible,
    shareCapital
  }
}
