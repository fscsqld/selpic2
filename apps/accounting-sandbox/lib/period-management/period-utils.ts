/**
 * Period Management Utilities
 * 
 * Helper functions for financial period management
 */

import { FinancialPeriod } from '../storage/period-types'
import { indexedDBStorage } from '../storage/indexed-db'
import { calculateBusinessMetrics } from '../utils/business-calculations'

/**
 * Generate period ID from date (format: YYYY-MM)
 */
export function generatePeriodId(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get period start and end dates for a given month
 */
export function getPeriodDates(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Last day of month
  return { startDate, endDate }
}

/**
 * Get current period dates
 */
export function getCurrentPeriodDates(): { startDate: Date; endDate: Date; periodId: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { startDate, endDate } = getPeriodDates(year, month)
  const periodId = generatePeriodId(now)
  return { startDate, endDate, periodId }
}

/**
 * Calculate closing balances for a period
 */
export function calculatePeriodClosingBalances(
  transactions: any[],
  openingDirectorLoanBalance: number,
  openingCashBalance: number
): {
  closingDirectorLoanBalance: number
  closingCashBalance: number
  accountsReceivable: number
} {
  const metrics = calculateBusinessMetrics(transactions, openingDirectorLoanBalance)
  
  // Calculate closing cash balance
  const totalCredits = transactions
    .filter(tx => tx.credit && 
                  tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' && 
                  tx.category !== 'NON_TAXABLE_TRANSFER')
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  const totalDebits = transactions
    .filter(tx => tx.debit && tx.category !== 'NON_TAXABLE_TRANSFER')
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)
  
  const closingCashBalance = openingCashBalance + totalCredits - totalDebits
  
  // Calculate accounts receivable (미수금)
  // Credit transactions that are income but haven't been paid yet
  const accountsReceivable = transactions
    .filter(tx => tx.credit && 
                  (tx.category === 'INCOME_TRADING' || 
                   tx.category === 'INCOME_SERVICE') &&
                  tx.description?.toUpperCase().includes('OUTSTANDING') ||
                  tx.description?.toUpperCase().includes('PENDING'))
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)
  
  return {
    closingDirectorLoanBalance: metrics.directorsLoanBalance,
    closingCashBalance,
    accountsReceivable,
  }
}

/**
 * Create or update period with calculated balances
 */
export async function createOrUpdatePeriod(
  periodId: string,
  transactions: any[],
  openingDirectorLoanBalance: number = 0,
  openingCashBalance: number = 0
): Promise<FinancialPeriod> {
  const now = new Date()
  const [year, month] = periodId.split('-').map(Number)
  const { startDate, endDate } = getPeriodDates(year, month)
  
  // Calculate closing balances
  const closingBalances = calculatePeriodClosingBalances(
    transactions,
    openingDirectorLoanBalance,
    openingCashBalance
  )
  
  // Check if period exists
  const existingPeriod = await indexedDBStorage.getPeriod(periodId)
  
  if (existingPeriod && existingPeriod.isLocked) {
    throw new Error(`Period ${periodId} is locked and cannot be updated`)
  }
  
  const period: FinancialPeriod = existingPeriod || {
    id: periodId,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    periodType: 'Monthly',
    openingDirectorLoanBalance,
    closingDirectorLoanBalance: closingBalances.closingDirectorLoanBalance,
    openingCashBalance,
    closingCashBalance: closingBalances.closingCashBalance,
    isLocked: false,
    accountsReceivable: closingBalances.accountsReceivable,
    carriedForwardReceivables: existingPeriod?.carriedForwardReceivables || [],
    createdAt: existingPeriod?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  // Update closing balances
  period.closingDirectorLoanBalance = closingBalances.closingDirectorLoanBalance
  period.closingCashBalance = closingBalances.closingCashBalance
  period.accountsReceivable = closingBalances.accountsReceivable
  period.updatedAt = new Date().toISOString()
  
  await indexedDBStorage.savePeriod(period)
  return period
}

/**
 * Close period and carry forward to next period
 */
export async function closePeriodAndCarryForward(
  periodId: string,
  lockedBy: string = 'owner'
): Promise<{ nextPeriod: FinancialPeriod }> {
  // Lock current period
  await indexedDBStorage.lockPeriod(periodId, lockedBy)
  
  // Get current period
  const currentPeriod = await indexedDBStorage.getPeriod(periodId)
  if (!currentPeriod) {
    throw new Error(`Period ${periodId} not found`)
  }
  
  // Calculate next period ID
  const [year, month] = periodId.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextPeriodId = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  
  // Carry forward balances
  await indexedDBStorage.carryForwardPeriod(periodId, nextPeriodId, lockedBy)
  
  // Get or create next period
  const nextPeriod = await indexedDBStorage.getPeriod(nextPeriodId)
  if (!nextPeriod) {
    throw new Error(`Failed to create next period ${nextPeriodId}`)
  }
  
  return { nextPeriod }
}

/**
 * Get receivables to carry forward (미수금 이월)
 */
export function getReceivablesToCarryForward(
  transactions: any[],
  periodId: string
): string[] {
  // Find transactions that are income but marked as outstanding/pending
  const receivableTransactions = transactions
    .filter(tx => tx.credit && 
                  (tx.category === 'INCOME_TRADING' || 
                   tx.category === 'INCOME_SERVICE') &&
                  (tx.description?.toUpperCase().includes('OUTSTANDING') ||
                   tx.description?.toUpperCase().includes('PENDING') ||
                   tx.description?.toUpperCase().includes('UNPAID')))
    .map(tx => tx.id || `${tx.date}_${tx.description}`)
  
  return receivableTransactions
}
