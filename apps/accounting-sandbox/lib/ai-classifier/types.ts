/**
 * AI 분류기 타입 정의
 */

import { BankTransaction } from '../pdf-parser/types'

/**
 * ATO 카테고리
 */
export interface ATOCategory {
  code: string
  name: string
  description: string
  parentCategory?: string
}

/**
 * 분류 결과
 */
export interface ClassificationResult {
  category: string
  confidence: number
  reason: string
  entityType?: 'partnership' | 'company' | 'personal'
  department?: 'cleaning' | 'sticker' | 'personal' | 'general' | 'unknown'
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  requiresPAYG?: boolean // PAYG 원천징수 필요 여부
  isPayrollTransaction?: boolean // 급여/보수 거래 여부
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner' // 급여 유형
  capitalImprovementWarning?: boolean // Capital Improvement 확인 필요 여부 (Repairs & Maintenance에서 $5,000 이상 또는 리모델링 키워드)
}

/**
 * AI 분류기 인터페이스
 */
export interface AIClassifier {
  /**
   * 거래 내역을 ATO 카테고리로 분류
   */
  classify(transaction: BankTransaction, context?: string[]): Promise<ClassificationResult>
}

