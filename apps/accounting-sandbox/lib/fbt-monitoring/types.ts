/**
 * FBT (Fringe Benefits Tax) 관련 타입 정의
 */

export type FBTCategory = 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
export type FBTRisk = 'low' | 'medium' | 'high'

/**
 * FBT 거래 정보
 */
export interface FBTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  fbtCategory: FBTCategory
  fbtRisk: FBTRisk
  isFBTRelevant: boolean
  isFBTReportable: boolean
  fbtAmount?: number
  employeeName?: string
  reasoning?: string
  confidence?: number
}

/**
 * FBT 감지 결과
 */
export interface FBTDetectionResult {
  isFBTRelevant: boolean
  fbtCategory?: FBTCategory
  fbtRisk?: FBTRisk
  isFBTReportable: boolean
  fbtAmount?: number
  reasoning?: string
  confidence: number
}

/**
 * FBT 보고서
 */
export interface FBTReport {
  financialYear: string
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalFBTAmount: number
    transactionCount: number
    byCategory: {
      meal: { count: number; total: number }
      entertainment: { count: number; total: number }
      travel: { count: number; total: number }
      vehicle: { count: number; total: number }
      other: { count: number; total: number }
    }
    byRisk: {
      low: { count: number; total: number }
      medium: { count: number; total: number }
      high: { count: number; total: number }
    }
  }
  transactions: FBTTransaction[]
}
