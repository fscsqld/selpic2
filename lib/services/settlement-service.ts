/**
 * 정산 서비스 (Settlement Service)
 * 
 * 자동화 생산 플랫폼의 핵심 정산 및 분쟁 시스템
 * 
 * ⚠️ 중요: 이 파일은 구상 단계의 서비스 코드입니다.
 * - 현재 홈페이지 개발과 완전히 별개로 관리됩니다
 * - 아직 구현 단계가 아닙니다
 */

import {
  RevenueCalculation,
  CalculateRevenueRequest,
  CalculateCompositeOrderRevenueRequest,
  CompositeOrderRevenue,
  CustomOrder,
  RevenueShare,
  SalesAgent,
  DesignerProfile,
  SettlementAdjustment,
  SettlementDashboard
} from '@/lib/types/production-platform-extended'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 정산 상태
 */
export type SettlementStatus = 
  | 'PENDING'      // 대기 중 (배송 완료 후 7일 유예 기간)
  | 'READY'        // 정산 준비 완료 (구매 확정 또는 7일 경과)
  | 'PROCESSING'   // 정산 처리 중
  | 'PAID'         // 지급 완료
  | 'CANCELLED'    // 취소됨 (환불)
  | 'FROZEN'       // 동결됨 (분쟁 발생)
  | 'FAILED'       // 실패

/**
 * 주문 상태
 */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'DISPUTE'
  | 'REFUNDED'
  | 'CANCELLED'

// ============================================================================
// 수익 분배 계산 (고도화 버전)
// ============================================================================

/**
 * 수익 분배 계산 (Option A 적용)
 * 
 * 비즈니스 룰:
 * 1. 기본 구조: 제작(40%) / 디자이너(20%) / 플랫폼(최대 40%) / 영업사원(10%)
 * 2. agentId 없으면 영업사원 몫 10%는 플랫폼 수익에 합산
 * 3. designerId === agentId인 경우 중복 수익 허용
 */
export function calculateRevenueAdvanced(
  request: CalculateRevenueRequest,
  designer?: DesignerProfile,
  agent?: SalesAgent
): RevenueCalculation {
  const {
    totalPrice,
    productionCost,
    designerRevenueRate = 0.20,
    agentId,
    agentRevenueRate = 0.10
  } = request

  // 제작 원가 (40% 고정)
  const production = Math.round(productionCost || totalPrice * 0.40)
  
  // 디자이너 수익 (20% 고정)
  const designerRevenue = Math.round(totalPrice * designerRevenueRate)
  
  // 중복 수익 확인: designerId === agentId
  const isDuplicateEarning = agentId && designer && agentId === designer.designerId
  
  let agentRevenue = 0
  let platformRevenue = 0
  
  if (agentId && agent) {
    // 영업사원이 있는 경우
    if (isDuplicateEarning) {
      // 중복 수익 허용: 디자이너가 영업사원 수익도 가져감
      agentRevenue = Math.round(totalPrice * agentRevenueRate)
      // 플랫폼 수익: 나머지 (30%)
      platformRevenue = totalPrice - production - designerRevenue - agentRevenue
    } else {
      // 일반 4자 분배
      agentRevenue = Math.round(totalPrice * agentRevenueRate)
      // 플랫폼 수익: 나머지 (30%)
      platformRevenue = totalPrice - production - designerRevenue - agentRevenue
    }
  } else {
    // 영업사원이 없는 경우: 3자 분배 (영업사원 몫을 플랫폼이 가져감)
    agentRevenue = 0
    // 플랫폼 수익: 나머지 (40%)
    platformRevenue = totalPrice - production - designerRevenue
  }
  
  // 안전장치: 우수리 금액은 플랫폼 수익에 합산
  const sum = production + designerRevenue + agentRevenue + platformRevenue
  const difference = totalPrice - sum
  if (difference !== 0) {
    platformRevenue += difference
  }
  
  // 검증
  const finalSum = production + designerRevenue + agentRevenue + platformRevenue
  if (Math.abs(finalSum - totalPrice) > 0.01) {
    throw new Error(`수익 분배 계산 오류: 합계 불일치 (${finalSum} vs ${totalPrice})`)
  }
  
  return {
    totalPrice,
    productionCost: production,
    platformRevenue,
    designerRevenue,
    agentRevenue,
    total: finalSum,
    distributionType: agentId ? 'four-way' : 'three-way',
    rates: {
      production: production / totalPrice,
      platform: platformRevenue / totalPrice,
      designer: designerRevenueRate,
      agent: agentId ? agentRevenueRate : 0
    },
    agent: agentId && agent ? {
      id: agentId,
      code: agent.agentCode,
      revenueRate: agentRevenueRate
    } : undefined
  }
}

/**
 * 복합 주문 수익 계산
 */
export function calculateCompositeOrderRevenueAdvanced(
  request: CalculateCompositeOrderRevenueRequest,
  designers: Map<string, DesignerProfile>,
  agents: Map<string, SalesAgent>
): CompositeOrderRevenue {
  const { orderId, items } = request
  
  // 각 아이템별 수익 계산
  const itemRevenues = items.map(item => {
    const designer = item.designerId ? designers.get(item.designerId) : undefined
    const agent = item.agentId ? agents.get(item.agentId) : undefined
    
    const revenue = calculateRevenueAdvanced({
      orderId,
      customOrderId: item.customOrderId,
      totalPrice: item.totalPrice,
      productionCost: item.productionCost,
      designerRevenueRate: item.designerRevenueRate,
      agentId: item.agentId,
      agentCode: item.agentCode,
      agentRevenueRate: item.agentRevenueRate || 0.10
    }, designer, agent)
    
    return {
      customOrderId: item.customOrderId,
      productName: item.productName,
      price: item.totalPrice,
      revenue
    }
  })
  
  // 전체 집계
  const totals = itemRevenues.reduce((acc, item) => ({
    productionCost: acc.productionCost + item.revenue.productionCost,
    platformRevenue: acc.platformRevenue + item.revenue.platformRevenue,
    designerRevenue: acc.designerRevenue + item.revenue.designerRevenue,
    agentRevenue: acc.agentRevenue + item.revenue.agentRevenue,
    total: acc.total + item.price
  }), { productionCost: 0, platformRevenue: 0, designerRevenue: 0, agentRevenue: 0, total: 0 })
  
  // 영업사원별 집계
  const agentMap = new Map<string, { agentId: string, agentCode: string, revenue: number, itemCount: number }>()
  
  itemRevenues.forEach(item => {
    if (item.revenue.agent) {
      const agentId = item.revenue.agent.id
      const existing = agentMap.get(agentId) || {
        agentId,
        agentCode: item.revenue.agent.code,
        revenue: 0,
        itemCount: 0
      }
      existing.revenue += item.revenue.agentRevenue
      existing.itemCount += 1
      agentMap.set(agentId, existing)
    }
  })
  
  return {
    orderId,
    totalOrderPrice: totals.total,
    items: itemRevenues,
    totals,
    agentBreakdown: Array.from(agentMap.values()),
    stats: {
      totalItems: items.length,
      itemsWithAgent: itemRevenues.filter(i => i.revenue.agent).length,
      itemsWithoutAgent: itemRevenues.filter(i => !i.revenue.agent).length,
      uniqueAgents: agentMap.size
    }
  }
}

// ============================================================================
// 정산 유예 및 구매 확정 로직
// ============================================================================

/**
 * 배송 완료 후 정산 상태 업데이트
 * 
 * DELIVERED 후 7일간 PENDING 상태 유지
 */
export function updateSettlementStatusOnDelivery(
  revenueShare: RevenueShare,
  orderStatus: OrderStatus,
  deliveredAt: Date
): SettlementStatus {
  if (orderStatus === 'DISPUTE') {
    return 'FROZEN' // 분쟁 발생 시 즉시 동결
  }
  
  if (orderStatus === 'DELIVERED') {
    const daysSinceDelivery = Math.floor(
      (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceDelivery < 7) {
      return 'PENDING' // 7일 유예 기간
    } else {
      return 'READY' // 7일 경과 시 정산 준비 완료
    }
  }
  
  if (orderStatus === 'CONFIRMED') {
    return 'READY' // 구매 확정 시 즉시 정산 준비 완료
  }
  
  return revenueShare.status as SettlementStatus
}

/**
 * 구매 확정 처리
 */
export function confirmPurchase(
  revenueShare: RevenueShare,
  confirmedAt: Date
): RevenueShare {
  if (revenueShare.status === 'FROZEN') {
    throw new Error('분쟁 중인 주문은 구매 확정할 수 없습니다.')
  }
  
  return {
    ...revenueShare,
    status: 'READY',
    updatedAt: confirmedAt
  }
}

/**
 * 분쟁 발생 처리
 */
export function createDispute(
  revenueShare: RevenueShare,
  disputeReason: string,
  disputedAt: Date
): RevenueShare {
  return {
    ...revenueShare,
    status: 'FROZEN',
    updatedAt: disputedAt
  }
}

// ============================================================================
// 환불 및 환수(Clawback) 시스템
// ============================================================================

/**
 * 환불 처리
 * 
 * 정산 전 환불: CANCELLED 처리
 * 정산 후 환불: Adjustment 레코드 생성
 */
export function processRefund(
  revenueShare: RevenueShare,
  refundAmount: number,
  refundReason: 'customer_request' | 'defect' | 'wrong_item' | 'other',
  refundedAt: Date
): {
  updatedRevenueShare: RevenueShare
  adjustment?: SettlementAdjustment
} {
  if (refundAmount > revenueShare.totalRevenue) {
    throw new Error('환불 금액이 총 수익을 초과할 수 없습니다.')
  }
  
  // 정산 전 환불 (PENDING, READY 상태)
  if (revenueShare.status === 'PENDING' || revenueShare.status === 'READY') {
    return {
      updatedRevenueShare: {
        ...revenueShare,
        status: 'CANCELLED',
        updatedAt: refundedAt
      }
    }
  }
  
  // 정산 후 환불 (PAID 상태)
  if (revenueShare.status === 'PAID') {
    // 각 파트너별 환수 금액 계산
    const totalRevenue = revenueShare.totalRevenue
    const refundRatio = refundAmount / totalRevenue
    
    const designerRefund = Math.round(revenueShare.designerRevenue * refundRatio)
    const agentRefund = revenueShare.agentId 
      ? Math.round((revenueShare.agentRevenue || 0) * refundRatio)
      : 0
    const platformRefund = refundAmount - designerRefund - agentRefund
    
    // Adjustment 레코드 생성
    const adjustments: SettlementAdjustment[] = []
    
    if (designerRefund > 0) {
      adjustments.push({
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        partnerType: 'designer',
        partnerId: revenueShare.designerId,
        orderId: revenueShare.orderId,
        customOrderId: revenueShare.customOrderId || '',
        revenueShareId: revenueShare.id,
        amount: -designerRefund, // 음수 (차감)
        reason: 'refund',
        description: `환불: ${refundReason}`,
        status: 'pending',
        createdAt: refundedAt,
        createdBy: 'system',
        updatedAt: refundedAt
      })
    }
    
    if (agentRefund > 0 && revenueShare.agentId) {
      adjustments.push({
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        partnerType: 'agent',
        partnerId: revenueShare.agentId,
        orderId: revenueShare.orderId,
        customOrderId: revenueShare.customOrderId || '',
        revenueShareId: revenueShare.id,
        amount: -agentRefund, // 음수 (차감)
        reason: 'refund',
        description: `환불: ${refundReason}`,
        status: 'pending',
        createdAt: refundedAt,
        createdBy: 'system',
        updatedAt: refundedAt
      })
    }
    
    // 플랫폼은 자동으로 차감 (별도 Adjustment 불필요)
    
    return {
      updatedRevenueShare: {
        ...revenueShare,
        updatedAt: refundedAt
      },
      adjustment: adjustments[0] // 첫 번째 Adjustment 반환 (실제로는 배열 전체 반환)
    }
  }
  
  // 이미 취소된 경우
  if (revenueShare.status === 'CANCELLED') {
    throw new Error('이미 취소된 정산입니다.')
  }
  
  throw new Error(`환불 처리 불가능한 상태: ${revenueShare.status}`)
}

// ============================================================================
// 정산 안전장치 (Safety Guards)
// ============================================================================

/**
 * 금액을 정수로 변환 (소수점 오차 방지)
 */
export function toIntegerAmount(amount: number): number {
  return Math.round(amount * 100) // 센트 단위로 변환
}

/**
 * 정수 금액을 원래 단위로 변환
 */
export function fromIntegerAmount(integerAmount: number): number {
  return integerAmount / 100
}

/**
 * 수익 분배 계산 (정수 기반)
 * 우수리 금액은 플랫폼 수익에 합산
 */
export function calculateRevenueWithInteger(
  request: CalculateRevenueRequest,
  designer?: DesignerProfile,
  agent?: SalesAgent
): RevenueCalculation {
  const totalPriceInt = toIntegerAmount(request.totalPrice)
  const productionCostInt = toIntegerAmount(request.productionCost || request.totalPrice * 0.40)
  const designerRevenueInt = toIntegerAmount(request.totalPrice * (request.designerRevenueRate || 0.20))
  
  const isDuplicateEarning = request.agentId && designer && request.agentId === designer.designerId
  const agentRevenueRate = request.agentRevenueRate || 0.10
  const agentRevenueInt = request.agentId 
    ? toIntegerAmount(request.totalPrice * agentRevenueRate)
    : 0
  
  // 플랫폼 수익 계산 (우수리 포함)
  let platformRevenueInt = totalPriceInt - productionCostInt - designerRevenueInt - agentRevenueInt
  
  // 검증: 합계가 정확히 일치하는지 확인
  const sum = productionCostInt + designerRevenueInt + agentRevenueInt + platformRevenueInt
  if (sum !== totalPriceInt) {
    // 우수리 금액을 플랫폼 수익에 합산
    const difference = totalPriceInt - sum
    platformRevenueInt += difference
  }
  
  // 정수에서 원래 단위로 변환
  return {
    totalPrice: fromIntegerAmount(totalPriceInt),
    productionCost: fromIntegerAmount(productionCostInt),
    platformRevenue: fromIntegerAmount(platformRevenueInt),
    designerRevenue: fromIntegerAmount(designerRevenueInt),
    agentRevenue: fromIntegerAmount(agentRevenueInt),
    total: fromIntegerAmount(totalPriceInt),
    distributionType: request.agentId ? 'four-way' : 'three-way',
    rates: {
      production: fromIntegerAmount(productionCostInt) / request.totalPrice,
      platform: fromIntegerAmount(platformRevenueInt) / request.totalPrice,
      designer: request.designerRevenueRate || 0.20,
      agent: request.agentId ? agentRevenueRate : 0
    },
    agent: request.agentId && agent ? {
      id: request.agentId,
      code: agent.agentCode,
      revenueRate: agentRevenueRate
    } : undefined
  }
}

// ============================================================================
// 정산 대시보드 데이터 생성
// ============================================================================

/**
 * 정산 대시보드 데이터 생성
 */
export function generateSettlementDashboard(
  partnerId: string,
  partnerType: 'designer' | 'agent',
  revenueShares: RevenueShare[],
  adjustments: SettlementAdjustment[]
): SettlementDashboard {
  // 파트너 관련 수익만 필터링
  const partnerRevenueShares = revenueShares.filter(rs => {
    if (partnerType === 'designer') {
      return rs.designerId === partnerId
    } else {
      return rs.agentId === partnerId
    }
  })
  
  // 파트너 관련 조정만 필터링
  const partnerAdjustments = adjustments.filter(adj => 
    adj.partnerId === partnerId && adj.partnerType === partnerType
  )
  
  // 수익 집계
  const totalRevenue = partnerRevenueShares
    .filter(rs => rs.status !== 'CANCELLED')
    .reduce((sum, rs) => {
      const revenue = partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0)
      return sum + revenue
    }, 0)
  
  const paidRevenue = partnerRevenueShares
    .filter(rs => rs.status === 'PAID')
    .reduce((sum, rs) => {
      const revenue = partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0)
      return sum + revenue
    }, 0)
  
  const pendingRevenue = partnerRevenueShares
    .filter(rs => rs.status === 'PENDING')
    .reduce((sum, rs) => {
      const revenue = partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0)
      return sum + revenue
    }, 0)
  
  const readyRevenue = partnerRevenueShares
    .filter(rs => rs.status === 'READY')
    .reduce((sum, rs) => {
      const revenue = partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0)
      return sum + revenue
    }, 0)
  
  // 조정 집계
  const totalAdjustments = partnerAdjustments
    .filter(adj => adj.status !== 'cancelled')
    .reduce((sum, adj) => sum + adj.amount, 0)
  
  const pendingAdjustments = partnerAdjustments
    .filter(adj => adj.status === 'pending')
    .reduce((sum, adj) => sum + adj.amount, 0)
  
  const appliedAdjustments = partnerAdjustments
    .filter(adj => adj.status === 'applied')
    .reduce((sum, adj) => sum + adj.amount, 0)
  
  // 최종 정산 가능 금액 (마이너스 허용)
  const availableForPayout = readyRevenue - pendingAdjustments
  
  // 🆕 파트너 잔액 (마이너스 허용)
  const currentBalance = partnerBalance?.currentBalance ?? 0
  const isNegativeBalance = partnerBalance?.isNegative ?? false
  
  // 통계
  const stats = {
    totalOrders: new Set(partnerRevenueShares.map(rs => rs.orderId)).size,
    totalRevenueShares: partnerRevenueShares.length,
    pendingCount: partnerRevenueShares.filter(rs => rs.status === 'PENDING').length,
    readyCount: partnerRevenueShares.filter(rs => rs.status === 'READY').length,
    paidCount: partnerRevenueShares.filter(rs => rs.status === 'PAID').length,
    frozenCount: partnerRevenueShares.filter(rs => rs.status === 'FROZEN').length,
    cancelledCount: partnerRevenueShares.filter(rs => rs.status === 'CANCELLED').length
  }
  
  return {
    partnerId,
    partnerType,
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    readyRevenue,
    totalAdjustments,
    pendingAdjustments,
    appliedAdjustments,
    availableForPayout, // 🆕 마이너스 허용 (음수 방지 제거)
    currentBalance, // 🆕 현재 잔액
    isNegativeBalance, // 🆕 마이너스 잔액 여부
    stats,
    adjustments: partnerAdjustments,
    calculationDetails // 🆕 계산 근거 (투명한 대시보드)
  }
}

// ============================================================================
// 정산 처리
// ============================================================================

/**
 * 정산 처리 (지급)
 */
export function processSettlement(
  revenueShare: RevenueShare,
  payoutMethod: 'bank' | 'paypal' | 'stripe',
  transactionId: string,
  paidAt: Date
): RevenueShare {
  if (revenueShare.status !== 'READY') {
    throw new Error(`정산 준비 완료 상태가 아닙니다. 현재 상태: ${revenueShare.status}`)
  }
  
  return {
    ...revenueShare,
    status: 'PAID',
    payout: {
      method: payoutMethod,
      transactionId,
      paidAt
    },
    paidAt,
    updatedAt: paidAt
  }
}

// ============================================================================
// 🆕 감사 로그 (Audit Log) - 로그 무결성 보장
// ============================================================================

/**
 * 감사 로그 인터페이스 (로그 무결성)
 */
export interface SettlementAuditLog {
  id: string
  entityType: 'revenue_share' | 'settlement_adjustment' | 'custom_order' | 'partner_balance'
  entityId: string
  entityVersion: number // 🆕 RevenueShare의 version 필드와 연동
  
  // 액션 정보
  action: 'created' | 'updated' | 'status_changed' | 'refunded' | 'calculated' | 'settled' | 'amount_changed'
  
  // 변경 내용 (JSON 형태)
  oldValue: any // 변경 전 전체 값
  newValue: any // 변경 후 전체 값
  changedFields?: Record<string, { old: any; new: any }> // 🆕 변경된 필드만 추출
  changeReason: string // 🆕 변경 사유 (필수)
  
  // 변경자 정보
  changedBy: string // 사용자 ID 또는 'system'
  changedAt: Date
  
  // 메타데이터
  ipAddress?: string
  userAgent?: string
  calculationDetails?: any // 계산 근거 (투명한 대시보드용)
}

/**
 * 레거시 호환을 위한 타입 별칭
 */
export type AuditLog = SettlementAuditLog

/**
 * 감사 로그 생성 (로그 무결성 보장)
 * 
 * 모든 정산 관련 변경사항을 변경 불가능한 로그로 기록
 * RevenueShare의 version 필드와 연동하여 버전 관리
 */
export function createSettlementAuditLog(
  entityType: SettlementAuditLog['entityType'],
  entityId: string,
  entityVersion: number,
  action: SettlementAuditLog['action'],
  oldValue: any,
  newValue: any,
  changeReason: string,
  changedBy: string,
  calculationDetails?: any,
  ipAddress?: string,
  userAgent?: string
): SettlementAuditLog {
  // 변경된 필드만 추출
  const changedFields = extractChangedFields(oldValue, newValue)
  
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    entityVersion,
    action,
    oldValue,
    newValue,
    changedFields,
    changeReason,
    changedBy,
    changedAt: new Date(),
    ipAddress,
    userAgent,
    calculationDetails
  }
}

/**
 * 변경된 필드만 추출 (JSON 비교)
 */
function extractChangedFields(oldValue: any, newValue: any): Record<string, { old: any; new: any }> {
  const changed: Record<string, { old: any; new: any }> = {}
  
  if (!oldValue || !newValue || typeof oldValue !== 'object' || typeof newValue !== 'object') {
    return changed
  }
  
  // 모든 키를 순회하며 변경된 필드 찾기
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  
  for (const key of allKeys) {
    const oldVal = oldValue[key]
    const newVal = newValue[key]
    
    // 깊은 비교 (JSON.stringify 사용)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed[key] = { old: oldVal, new: newVal }
    }
  }
  
  return changed
}

/**
 * 레거시 호환을 위한 함수
 */
export function createAuditLog(
  entityType: SettlementAuditLog['entityType'],
  entityId: string,
  action: SettlementAuditLog['action'],
  oldValue: any,
  newValue: any,
  changedBy: string,
  reason?: string,
  calculationDetails?: any
): SettlementAuditLog {
  return createSettlementAuditLog(
    entityType,
    entityId,
    1, // 기본 버전
    action,
    oldValue,
    newValue,
    reason || 'No reason provided',
    changedBy,
    calculationDetails
  )
}

// ============================================================================
// 🆕 마이너스 잔액 처리
// ============================================================================

/**
 * 파트너 잔액 업데이트 (마이너스 허용)
 * 
 * 환불액이 현재 잔액보다 클 경우 마이너스로 기록
 */
export function updatePartnerBalance(
  partnerId: string,
  partnerType: 'designer' | 'agent',
  amount: number, // 양수: 수익, 음수: 차감
  adjustmentId?: string
): {
  newBalance: number
  isNegative: boolean
} {
  // 실제 구현 시: 데이터베이스에서 현재 잔액 조회
  // const currentBalance = await db.query(`
  //   SELECT current_balance FROM partner_balances
  //   WHERE partner_id = $1 AND partner_type = $2
  // `, [partnerId, partnerType])
  
  // 임시 로직 (실제 구현 시 제거)
  const currentBalance = 0
  
  const newBalance = currentBalance + amount
  const isNegative = newBalance < 0
  
  // 실제 구현 시: 데이터베이스 업데이트
  // await db.query(`
  //   INSERT INTO partner_balances (partner_id, partner_type, current_balance, last_updated_at)
  //   VALUES ($1, $2, $3, NOW())
  //   ON CONFLICT (partner_id, partner_type)
  //   DO UPDATE SET
  //     current_balance = $3,
  //     last_updated_at = NOW()
  // `, [partnerId, partnerType, newBalance])
  
  return {
    newBalance,
    isNegative
  }
}

/**
 * 환불 처리 (마이너스 잔액 허용)
 * 
 * 환불액이 현재 잔액보다 클 경우 마이너스로 기록하고 다음 정산 시 최우선 차감
 */
export function processRefundWithNegativeBalance(
  revenueShare: RevenueShare,
  refundAmount: number,
  refundReason: 'customer_request' | 'defect' | 'wrong_item' | 'other',
  refundedAt: Date
): {
  updatedRevenueShare: RevenueShare
  adjustment?: SettlementAdjustment
  newBalance: number
  isNegative: boolean
  auditLog: AuditLog
} {
  const refundResult = processRefund(
    revenueShare,
    refundAmount,
    refundReason,
    refundedAt
  )
  
  // 각 파트너별 잔액 업데이트
  const partnerType = revenueShare.designerId ? 'designer' : 'agent'
  const partnerId = revenueShare.designerId || revenueShare.agentId || ''
  
  if (partnerId && refundResult.adjustment) {
    const balanceUpdate = updatePartnerBalance(
      partnerId,
      partnerType,
      refundResult.adjustment.amount, // 음수
      refundResult.adjustment.id
    )
    
    // 감사 로그 생성
    const auditLog = createAuditLog(
      'revenue_share',
      revenueShare.id,
      'refunded',
      { balance: 0 }, // 실제 구현 시 현재 잔액 조회
      { balance: balanceUpdate.newBalance, isNegative: balanceUpdate.isNegative },
      'system',
      `환불 처리: ${refundReason}`,
      {
        refundAmount,
        adjustmentId: refundResult.adjustment.id,
        newBalance: balanceUpdate.newBalance
      }
    )
    
    return {
      ...refundResult,
      newBalance: balanceUpdate.newBalance,
      isNegative: balanceUpdate.isNegative,
      auditLog
    }
  }
  
  // 감사 로그 생성 (adjustment 없는 경우)
  const auditLog = createAuditLog(
    'revenue_share',
    revenueShare.id,
    'refunded',
    revenueShare,
    refundResult.updatedRevenueShare,
    'system',
    `환불 처리: ${refundReason}`
  )
  
  return {
    ...refundResult,
    newBalance: 0,
    isNegative: false,
    auditLog
  }
}

// ============================================================================
// 🆕 투명한 대시보드 (계산 근거 포함)
// ============================================================================

/**
 * 수익 분배 계산 (계산 근거 및 계산식 포함)
 * 
 * 파트너가 수익을 납득할 수 있도록 계산 근거를 상세히 반환
 * 계산식: (판매가 - 제작원가 - 플랫폼수수료 - 타파트너수수료) = 나의수익
 */
export function calculateRevenueWithDetails(
  request: CalculateRevenueRequest,
  partnerType: 'designer' | 'agent',
  designer?: DesignerProfile,
  agent?: SalesAgent
): RevenueCalculation & {
  calculationDetails: {
    totalPrice: number
    productionCost: number
    productionCostRate: number
    designerRevenueRate: number
    agentRevenueRate: number
    platformRevenueRate: number
    distributionType: 'three-way' | 'four-way'
    isDuplicateEarning: boolean
    breakdown: {
      production: { amount: number; rate: number; description: string }
      platform: { amount: number; rate: number; description: string }
      designer: { amount: number; rate: number; description: string }
      agent?: { amount: number; rate: number; description: string }
    }
    formula: {
      text: string // 계산식 텍스트
      components: {
        totalPrice: number
        productionCost: number
        platformFee: number
        otherPartnerFee: number
        myRevenue: number
      }
    }
  }
} {
  const revenue = calculateRevenueAdvanced(request, designer, agent)
  
  const isDuplicateEarning = request.agentId && designer && request.agentId === designer.designerId
  
  // 파트너별 수익 계산
  const myRevenue = partnerType === 'designer' 
    ? revenue.designerRevenue 
    : (revenue.agentRevenue || 0)
  
  const otherPartnerFee = partnerType === 'designer'
    ? (revenue.agentRevenue || 0) // 디자이너 관점에서 영업사원 수수료
    : revenue.designerRevenue // 영업사원 관점에서 디자이너 수수료
  
  // 계산식 구성
  const formulaText = partnerType === 'designer'
    ? `(판매가 $${(revenue.totalPrice / 100).toFixed(2)} - 제작원가 $${(revenue.productionCost / 100).toFixed(2)} - 플랫폼수수료 $${(revenue.platformRevenue / 100).toFixed(2)} - 영업사원수수료 $${((revenue.agentRevenue || 0) / 100).toFixed(2)}) = 디자이너수익 $${(myRevenue / 100).toFixed(2)}`
    : `(판매가 $${(revenue.totalPrice / 100).toFixed(2)} - 제작원가 $${(revenue.productionCost / 100).toFixed(2)} - 플랫폼수수료 $${(revenue.platformRevenue / 100).toFixed(2)} - 디자이너수수료 $${(revenue.designerRevenue / 100).toFixed(2)}) = 영업사원수익 $${(myRevenue / 100).toFixed(2)}`
  
  const calculationDetails = {
    totalPrice: revenue.totalPrice,
    productionCost: revenue.productionCost,
    productionCostRate: revenue.rates.production,
    designerRevenueRate: revenue.rates.designer,
    agentRevenueRate: revenue.rates.agent || 0,
    platformRevenueRate: revenue.rates.platform,
    distributionType: revenue.distributionType,
    isDuplicateEarning: isDuplicateEarning || false,
    breakdown: {
      production: {
        amount: revenue.productionCost,
        rate: revenue.rates.production,
        description: '제작 원가 (고정 40%)'
      },
      platform: {
        amount: revenue.platformRevenue,
        rate: revenue.rates.platform,
        description: revenue.distributionType === 'three-way'
          ? '플랫폼 수익 (영업사원 수익 포함, 40%)'
          : '플랫폼 수익 (30%)'
      },
      designer: {
        amount: revenue.designerRevenue,
        rate: revenue.rates.designer,
        description: isDuplicateEarning
          ? '디자이너 수익 (20%) + 영업사원 수익 (10%) = 30%'
          : '디자이너 수익 (고정 20%)'
      },
      ...(revenue.agent && revenue.agentRevenue > 0 ? {
        agent: {
          amount: revenue.agentRevenue,
          rate: revenue.rates.agent || 0,
          description: isDuplicateEarning
            ? '영업사원 수익 (디자이너와 동일인, 이미 디자이너 수익에 포함)'
            : '영업사원 수익 (10%)'
        }
      } : {})
    },
    formula: {
      text: formulaText,
      components: {
        totalPrice: revenue.totalPrice,
        productionCost: revenue.productionCost,
        platformFee: revenue.platformRevenue,
        otherPartnerFee: otherPartnerFee,
        myRevenue: myRevenue
      }
    }
  }
  
  return {
    ...revenue,
    calculationDetails
  }
}

