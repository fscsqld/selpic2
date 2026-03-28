/**
 * WorkCover Module - WorkCover 보험료 추산 로직
 * 
 * 급여 합계에 연동된 예상 보험료 계산기
 */

import { WorkCoverEstimate, WorkCoverPolicy } from './types'
import { WORKCOVER_BASE_RATE } from '../../shared/constants/tax-rates'

/**
 * WorkCover 보험료 추산
 * @param totalWages - 총 급여 합계
 * @param rate - 보험료율 (기본값 사용 시 undefined)
 * @param adjustments - 추가 조정 사항
 * @returns 보험료 추산 결과
 */
export function estimateWorkCoverPremium(
  totalWages: number,
  rate?: number,
  adjustments: Array<{ description: string; amount: number }> = []
): WorkCoverEstimate {
  const effectiveRate = rate || WORKCOVER_BASE_RATE
  const basePremium = Math.round((totalWages * effectiveRate) * 100) / 100
  
  const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0)
  const estimatedPremium = basePremium + totalAdjustments
  
  return {
    totalWages,
    estimatedPremium,
    rate: effectiveRate * 100, // Convert to percentage
    calculationDate: new Date().toISOString(),
    breakdown: {
      basePremium,
      adjustments,
    },
  }
}

/**
 * WorkCover 보험료율 계산
 * @param industry - 산업 분류 (향후 확장)
 * @param state - 주 (QLD, NSW, VIC 등)
 * @returns 보험료율
 */
export function calculateWorkCoverRate(
  industry?: string,
  state?: string
): number {
  // 기본값 사용 (실제로는 산업별/주별로 다름)
  // 향후 확장: 산업별/주별 세율표 적용
  return WORKCOVER_BASE_RATE
}

/**
 * WorkCover 갱신일 계산
 * @param policy - WorkCover 정책
 * @returns 갱신일
 */
export function getWorkCoverRenewalDate(policy: WorkCoverPolicy): Date {
  return new Date(policy.renewalDate)
}

/**
 * WorkCover 정책 만료 확인
 * @param policy - WorkCover 정책
 * @returns 만료 여부 및 남은 일수
 */
export function checkWorkCoverExpiry(policy: WorkCoverPolicy): {
  isExpired: boolean
  daysUntilExpiry: number
  isExpiringSoon: boolean
} {
  const endDate = new Date(policy.endDate)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    isExpired: daysUntilExpiry < 0,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
  }
}
