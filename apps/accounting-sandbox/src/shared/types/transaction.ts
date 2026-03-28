/**
 * Transaction 기본 타입 정의
 * 모든 거래 관련 타입의 기본이 되는 인터페이스
 */

export interface BaseTransaction {
  id?: string
  reference?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
  category?: string
  department?: string
  confidence?: number | string // Can be number (0-1) or "Manual" or "Learned" string
  source?: 'bank' | 'manual' | 'payroll' | 'order'
  receiptImageId?: string
}

export interface ClassifiedTransaction extends BaseTransaction {
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  isLearnedMapping?: boolean
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  }
  capitalImprovementWarning?: boolean
  isUnusualCredit?: boolean
  fbtInfo?: {
    isFBTRelevant: boolean
    fbtCategory?: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
    fbtRisk?: 'low' | 'medium' | 'high'
    isFBTReportable: boolean
    fbtAmount?: number
    reasoning?: string
    confidence: number
  }
  gstInfo?: {
    hasGST: boolean
    gstAmount?: number
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    netAmount?: number
  }
}

export interface BankTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
}

export type Transaction = ClassifiedTransaction
