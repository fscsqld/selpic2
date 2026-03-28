/**
 * GST 정산 관련 타입 정의
 */

/**
 * GST 포함 여부 유형
 */
export type GSTType = 'INCLUDED' | 'EXCLUDED' | 'FREE'

/**
 * 거래 유형
 */
export type TransactionType = 'sale' | 'purchase' | 'expense'

/**
 * GST 거래 정보
 */
export interface GSTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  isGSTIncluded: boolean              // GST 포함 여부
  gstType: GSTType                    // GST 유형
  gstAmount?: number                  // GST 금액 (계산됨)
  netAmount?: number                  // GST 제외 금액
  gstRate: number                     // GST 세율 (기본 10%)
  transactionType: TransactionType
  confidence: number                   // AI 판별 신뢰도 (0-1)
  reasoning?: string                   // 판별 근거
}

/**
 * GST 감지 결과
 */
export interface GSTDetectionResult {
  isGSTIncluded: boolean
  gstType: GSTType
  gstAmount: number
  netAmount: number
  transactionType: TransactionType
  confidence: number
  reasoning?: string
}
