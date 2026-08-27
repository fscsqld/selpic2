import type { BankTransaction } from '@/lib/pdf-parser/types'

export type LedgerTransactionSource = 'bank' | 'manual' | 'payroll' | 'order' | 'journal'

export interface ClassifiedTransaction {
  id?: string
  date: BankTransaction['date']
  description: BankTransaction['description']
  debit: BankTransaction['debit']
  credit: BankTransaction['credit']
  /** Optional — cash / manual rows often have balance 0 or omit */
  balance?: BankTransaction['balance']
  reference?: BankTransaction['reference']
  entityType?: BankTransaction['entityType']
  category?: string
  confidence?: number | string
  department?: string
  /** bank | manual | payroll | order | journal — used by Biz Intel / History filters */
  source?: LedgerTransactionSource
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  isLearnedMapping?: boolean
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn?: boolean
    warningMessage?: string
    withholdingAmount?: number
  }
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence?: number
    reasoning?: string
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
  fundedByDirector?: boolean
  paidBy?: 'company' | 'director'
  receiptImageId?: string
  matchedEmployee?: {
    id: string
    name: string
    employeeId: string
    type: string
  }
  matchConfidence?: 'high' | 'medium' | 'low'
  matchReason?: string
}

export type DashboardTab = 'dashboard' | 'history' | 'settings' | 'reports' | 'ato' | 'hr'
