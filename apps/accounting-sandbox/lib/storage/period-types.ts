/**
 * Period Management Types
 * 
 * Defines data structures for financial period management
 */

export interface FinancialPeriod {
  id: string // Format: "YYYY-MM" (e.g., "2025-01")
  startDate: string // ISO date string
  endDate: string // ISO date string
  periodType: 'Monthly' | 'Quarterly' | 'Yearly'
  
  // Opening/Closing Balances
  openingDirectorLoanBalance: number
  closingDirectorLoanBalance: number
  openingCashBalance: number
  closingCashBalance: number
  
  // Period Status
  isLocked: boolean // 정산 완료 시 true (수정 불가)
  lockedAt?: string // ISO date string
  lockedBy?: string // User ID or 'system'
  
  // Accounts Receivable (미수금)
  accountsReceivable: number // 결제 미완료 금액
  carriedForwardReceivables: string[] // 이월된 거래 ID 목록
  
  // Metadata
  createdAt: string
  updatedAt: string
  notes?: string
}

export interface PeriodCarryForward {
  fromPeriodId: string
  toPeriodId: string
  directorLoanBalance: number
  cashBalance: number
  receivables: string[] // Transaction IDs
  carriedForwardAt: string
  carriedForwardBy: string
}
