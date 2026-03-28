/**
 * 출금 요청 서비스 (Payout Service)
 * 
 * 마이너스 잔액 로직 포함
 * 
 * ⚠️ 중요: 이 파일은 구상 단계의 서비스 코드입니다.
 * - 현재 홈페이지 개발과 완전히 별개로 관리됩니다
 * - 아직 구현 단계가 아닙니다
 */

import { PartnerBalance } from '@/lib/types/production-platform-extended'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 출금 요청
 */
export interface PayoutRequest {
  id: string
  partnerId: string
  partnerType: 'designer' | 'agent'
  
  // 출금 정보
  requestedAmount: number // 요청 금액 (센트)
  availableBalance: number // 출금 가능 잔액 (마이너스 가능)
  isNegativeBalance: boolean // 마이너스 잔액 여부
  
  // 상태
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled'
  rejectionReason?: string
  
  // 지급 정보
  payoutMethod: 'bank' | 'paypal' | 'stripe'
  payoutAccountInfo: Record<string, any> // 계좌 정보
  
  // 처리 정보
  processedAt?: Date
  processedBy?: string
  transactionId?: string
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// 마이너스 잔액 로직
// ============================================================================

/**
 * 출금 요청 생성
 * 
 * 마이너스 잔액 체크 및 출금 버튼 비활성화 로직 포함
 */
export function createPayoutRequest(
  partnerId: string,
  partnerType: 'designer' | 'agent',
  requestedAmount: number,
  partnerBalance: PartnerBalance,
  payoutMethod: 'bank' | 'paypal' | 'stripe',
  payoutAccountInfo: Record<string, any>
): {
  payoutRequest: PayoutRequest
  canProcess: boolean
  reason?: string
} {
  const totalRevenue = partnerBalance.totalRevenue || 0
  const isNegativeBalance = totalRevenue < 0
  
  // 마이너스 잔액인 경우 출금 불가
  if (isNegativeBalance) {
    return {
      payoutRequest: {
        id: `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        partnerId,
        partnerType,
        requestedAmount,
        availableBalance: totalRevenue,
        isNegativeBalance: true,
        status: 'rejected',
        rejectionReason: `마이너스 잔액으로 인해 출금할 수 없습니다. 현재 잔액: ${(totalRevenue / 100).toFixed(2)}원. 다음 정산 시 ${Math.abs(totalRevenue / 100).toFixed(2)}원이 공제됩니다.`,
        payoutMethod,
        payoutAccountInfo,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      canProcess: false,
      reason: '마이너스 잔액으로 인해 출금할 수 없습니다.'
    }
  }
  
  // 출금 가능 금액 체크
  if (requestedAmount > totalRevenue) {
    return {
      payoutRequest: {
        id: `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        partnerId,
        partnerType,
        requestedAmount,
        availableBalance: totalRevenue,
        isNegativeBalance: false,
        status: 'rejected',
        rejectionReason: `요청 금액이 출금 가능 잔액을 초과합니다. 출금 가능: ${(totalRevenue / 100).toFixed(2)}원`,
        payoutMethod,
        payoutAccountInfo,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      canProcess: false,
      reason: '요청 금액이 출금 가능 잔액을 초과합니다.'
    }
  }
  
  // 정상 출금 요청
  return {
    payoutRequest: {
      id: `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      partnerId,
      partnerType,
      requestedAmount,
      availableBalance: totalRevenue,
      isNegativeBalance: false,
      status: 'pending',
      payoutMethod,
      payoutAccountInfo,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    canProcess: true
  }
}

/**
 * 다음 정산 시 마이너스 잔액 공제
 * 
 * ABS(마이너스 잔액)만큼 공제 후 잔액 업데이트
 */
export function applyNegativeBalanceDeduction(
  partnerBalance: PartnerBalance,
  newRevenue: number // 새로운 정산 금액 (센트)
): {
  updatedBalance: PartnerBalance
  deductionAmount: number // 공제된 금액
  remainingBalance: number // 남은 잔액
} {
  const currentBalance = partnerBalance.totalRevenue || 0
  const isNegative = currentBalance < 0
  
  if (!isNegative) {
    // 마이너스 잔액이 없으면 그대로 반환
    return {
      updatedBalance: {
        ...partnerBalance,
        totalRevenue: currentBalance + newRevenue,
        lastUpdatedAt: new Date()
      },
      deductionAmount: 0,
      remainingBalance: currentBalance + newRevenue
    }
  }
  
  // 마이너스 잔액 공제
  const negativeAmount = Math.abs(currentBalance) // ABS(마이너스 잔액)
  const deductionAmount = Math.min(negativeAmount, newRevenue) // 공제 금액 (새 수익을 초과하지 않음)
  const remainingBalance = currentBalance + newRevenue - deductionAmount // 남은 잔액
  
  return {
    updatedBalance: {
      ...partnerBalance,
      totalRevenue: remainingBalance,
      lastUpdatedAt: new Date()
    },
    deductionAmount,
    remainingBalance
  }
}

/**
 * 출금 요청 처리
 */
export function processPayoutRequest(
  payoutRequest: PayoutRequest,
  transactionId: string,
  processedBy: string
): PayoutRequest {
  if (payoutRequest.status !== 'pending' && payoutRequest.status !== 'approved') {
    throw new Error(`출금 요청을 처리할 수 없습니다. 현재 상태: ${payoutRequest.status}`)
  }
  
  if (payoutRequest.isNegativeBalance) {
    throw new Error('마이너스 잔액으로 인해 출금할 수 없습니다.')
  }
  
  return {
    ...payoutRequest,
    status: 'processed',
    transactionId,
    processedBy,
    processedAt: new Date(),
    updatedAt: new Date()
  }
}

