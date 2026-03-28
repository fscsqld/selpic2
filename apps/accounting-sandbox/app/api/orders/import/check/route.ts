/**
 * Check for Pending Orders API
 * 
 * 클라이언트에서 주기적으로 호출하여 새로운 주문이 있는지 확인
 * 실제로는 홈페이지에서 직접 주문을 보내므로, 이 API는 필요 없을 수 있음
 * 하지만 호환성을 위해 유지
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 이 API는 실제로는 사용되지 않을 수 있음
  // 홈페이지에서 직접 주문을 보내므로
  return NextResponse.json({
    success: true,
    orders: [],
    message: 'No pending orders. Orders are sent directly from homepage.'
  })
}
