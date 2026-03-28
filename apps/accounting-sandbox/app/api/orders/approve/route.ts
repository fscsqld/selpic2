/**
 * Order Approval API (홈페이지 연동용)
 * 
 * ⚠️ 안전성 우선: 기존 홈페이지 API 응답 구조를 절대 변경하지 않음
 * 회계 장부 기록은 비동기로 처리하여 홈페이지 속도에 영향 없음
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminForOrderApproval } from '@/middleware/accounting-auth'
import { recordOrderToAccountingAsync } from '@/src/features/transactions/order-approval-integration'
import { Order } from '@/src/shared/types/order'
import { auditLogger } from '@/src/shared/logging/audit-logger'

/**
 * POST /api/orders/approve
 * 
 * 주문 승인 및 회계 장부 자동 기록
 * 
 * ⚠️ 중요:
 * 1. 기존 홈페이지 API 응답 구조 유지
 * 2. 회계 장부 기록은 비동기로 처리 (await 하지 않음)
 * 3. 회계 장부 기록 실패가 홈페이지 응답에 영향 없음
 */
export async function POST(request: NextRequest) {
  // 1. Admin 권한 확인
  const authError = requireAdminForOrderApproval(request)
  if (authError) {
    return authError
  }

  const userRole = request.headers.get('x-user-role') || 'unknown'
  const userId = request.headers.get('x-user-id') || 'unknown'

  try {
    const body = await request.json()
    const { order } = body as { order: Order }

    if (!order) {
      return NextResponse.json(
        { error: 'Missing required field: order' },
        { status: 400 }
      )
    }

    // 2. 기존 홈페이지 주문 승인 로직 (여기서는 간단히 처리)
    // 실제로는 홈페이지의 기존 승인 로직을 호출해야 함
    const orderApprovalResult = {
      success: true,
      order: {
        ...order,
        status: 'approved' as const,
        approvedAt: new Date().toISOString(),
      },
    }

    // 3. 즉시 응답 반환 (기존 홈페이지 API 응답 구조 유지)
    const response = NextResponse.json({
      success: orderApprovalResult.success,
      order: orderApprovalResult.order,
      // 기존 응답 구조 그대로 유지
    })

    // 4. 회계 장부 기록은 비동기로 처리 (await 하지 않음)
    // 에러가 나도 홈페이지 응답에는 영향 없음
    recordOrderToAccountingAsync(order, userId, userRole)

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    auditLogger.log('order_approval_api_error', {
      userId,
      userRole,
      resource: 'order_approval',
      details: { error: errorMessage },
      success: false,
      error: errorMessage,
    })

    // 에러 발생 시에도 기존 홈페이지 응답 구조 유지
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to approve order',
        // 기존 응답 구조 유지
      },
      { status: 500 }
    )
  }
}
