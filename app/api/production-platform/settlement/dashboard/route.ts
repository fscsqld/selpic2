/**
 * 정산 대시보드 API
 * 
 * 영업사원별/디자이너별 수익과 차감 예정액(Adjustment)을 보여주는 API
 * 
 * ⚠️ 중요: 이 파일은 구상 단계의 API 코드입니다.
 * - 현재 홈페이지 개발과 완전히 별개로 관리됩니다
 * - 아직 구현 단계가 아닙니다
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateSettlementDashboard,
  SettlementDashboard,
  calculateRevenueWithDetails
} from '@/lib/services/settlement-service'
import { CalculateRevenueRequest } from '@/lib/types/production-platform-extended'

// ============================================================================
// API 엔드포인트
// ============================================================================

/**
 * GET /api/production-platform/settlement/dashboard
 * 
 * 정산 대시보드 데이터 조회
 * 
 * Query Parameters:
 * - partnerId: 파트너 ID (필수)
 * - partnerType: 파트너 타입 - 'designer' | 'agent' (필수)
 * - startDate: 시작 날짜 (선택, ISO 8601 형식)
 * - endDate: 종료 날짜 (선택, ISO 8601 형식)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const partnerId = searchParams.get('partnerId')
    const partnerType = searchParams.get('partnerType') as 'designer' | 'agent'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // 파라미터 검증
    if (!partnerId) {
      return NextResponse.json(
        { error: 'partnerId is required' },
        { status: 400 }
      )
    }
    
    if (!partnerType || (partnerType !== 'designer' && partnerType !== 'agent')) {
      return NextResponse.json(
        { error: 'partnerType must be "designer" or "agent"' },
        { status: 400 }
      )
    }
    
    // 실제 구현 시: 데이터베이스에서 조회
    // const revenueShares = await db.query(`
    //   SELECT * FROM revenue_shares 
    //   WHERE ${partnerType === 'designer' ? 'designer_id' : 'agent_id'} = $1
    //   AND created_at >= $2 AND created_at <= $3
    // `, [partnerId, startDate || '1970-01-01', endDate || '9999-12-31'])
    // 
    // const adjustments = await db.query(`
    //   SELECT * FROM settlement_adjustments
    //   WHERE partner_type = $1 AND partner_id = $2
    //   AND status != 'cancelled'
    // `, [partnerType, partnerId])
    
    // 임시 데이터 (실제 구현 시 제거)
    const revenueShares: any[] = []
    const adjustments: any[] = []
    
    // 대시보드 데이터 생성
    const dashboard = generateSettlementDashboard(
      partnerId,
      partnerType,
      revenueShares,
      adjustments
    )
    
    // 🆕 계산식이 포함된 수익 상세 정보 생성
    const revenueDetails = revenueShares.map(rs => {
      // 실제 구현 시: designer와 agent 정보 조회
      // const designer = await getDesignerProfile(rs.designerId)
      // const agent = rs.agentId ? await getSalesAgent(rs.agentId) : undefined
      
      const request: CalculateRevenueRequest = {
        orderId: rs.orderId,
        customOrderId: rs.customOrderId,
        totalPrice: rs.totalRevenue,
        productionCost: rs.productionCost,
        designerRevenueRate: rs.designerRevenue / rs.totalRevenue,
        agentId: rs.agentId,
        agentCode: rs.agentCode,
        agentRevenueRate: rs.agentRevenue / rs.totalRevenue
      }
      
      // 계산식 포함 상세 정보
      const calculation = calculateRevenueWithDetails(
        request,
        partnerType,
        undefined, // designer - 실제 구현 시 조회
        undefined  // agent - 실제 구현 시 조회
      )
      
      return {
        orderId: rs.orderId,
        customOrderId: rs.customOrderId,
        calculationFormula: calculation.calculationDetails.formula,
        breakdown: calculation.calculationDetails.breakdown,
        calculatedAt: rs.createdAt
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ...dashboard,
        revenueDetails // 🆕 계산식이 포함된 수익 상세 정보
      },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('❌ Error fetching settlement dashboard:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTLEMENT_DASHBOARD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/production-platform/settlement/dashboard/summary
 * 
 * 정산 대시보드 요약 정보 (여러 파트너)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partnerIds, partnerType } = body
    
    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return NextResponse.json(
        { error: 'partnerIds must be a non-empty array' },
        { status: 400 }
      )
    }
    
    if (!partnerType || (partnerType !== 'designer' && partnerType !== 'agent')) {
      return NextResponse.json(
        { error: 'partnerType must be "designer" or "agent"' },
        { status: 400 }
      )
    }
    
    // 실제 구현 시: 데이터베이스에서 일괄 조회
    // const dashboards = await Promise.all(
    //   partnerIds.map(partnerId => 
    //     generateSettlementDashboard(partnerId, partnerType, revenueShares, adjustments)
    //   )
    // )
    
    // 임시 데이터
    const dashboards: SettlementDashboard[] = []
    
    return NextResponse.json({
      success: true,
      data: {
        dashboards,
        summary: {
          totalPartners: dashboards.length,
          totalRevenue: dashboards.reduce((sum, d) => sum + d.totalRevenue, 0),
          totalReadyRevenue: dashboards.reduce((sum, d) => sum + d.readyRevenue, 0),
          totalAdjustments: dashboards.reduce((sum, d) => sum + d.totalAdjustments, 0)
        }
      },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('❌ Error fetching settlement dashboard summary:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTLEMENT_DASHBOARD_SUMMARY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      },
      { status: 500 }
    )
  }
}

