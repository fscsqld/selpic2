/**
 * Get Pending Orders API
 * 
 * 회계 프로그램 클라이언트에서 호출하여 최근에 받은 주문 목록을 가져옴
 * 이 API는 최근 1시간 내에 받은 주문을 반환
 */

import { NextRequest, NextResponse } from 'next/server'

// 임시 메모리 저장소 (실제로는 Redis나 DB를 사용해야 함)
// 주문을 받은 시간과 함께 저장
const pendingOrdersStore: Map<string, {
  orders: any[]
  receivedAt: number
  period: { startDate: string; endDate: string }
}> = new Map()

// 주문 저장 (POST /api/orders/import에서 호출)
export function savePendingOrders(sessionId: string, orders: any[], period: { startDate: string; endDate: string }) {
  pendingOrdersStore.set(sessionId, {
    orders,
    receivedAt: Date.now(),
    period
  })
  
  // 1시간 후 자동 삭제
  setTimeout(() => {
    pendingOrdersStore.delete(sessionId)
  }, 60 * 60 * 1000)
  
  console.log(`[Pending Orders API] Saved ${orders.length} orders for session: ${sessionId}`)
}

/**
 * GET /api/orders/pending
 * 최근에 받은 주문 목록 반환
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id') || 'default'
    
    console.log('[Pending Orders API] Checking for pending orders, session:', sessionId)
    
    const stored = pendingOrdersStore.get(sessionId)
    
    if (!stored) {
      // 모든 세션의 주문 확인 (fallback)
      const allOrders: any[] = []
      for (const [key, value] of pendingOrdersStore.entries()) {
        // 최근 1시간 내 주문만
        if (Date.now() - value.receivedAt < 60 * 60 * 1000) {
          allOrders.push(...value.orders)
        }
      }
      
      if (allOrders.length > 0) {
        console.log(`[Pending Orders API] Found ${allOrders.length} orders from all sessions`)
        return NextResponse.json({
          success: true,
          orders: allOrders,
          count: allOrders.length
        })
      }
      
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No pending orders found'
      })
    }
    
    // 최근 1시간 내 주문만 반환
    if (Date.now() - stored.receivedAt > 60 * 60 * 1000) {
      pendingOrdersStore.delete(sessionId)
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'Pending orders expired'
      })
    }
    
    console.log(`[Pending Orders API] Returning ${stored.orders.length} orders for session: ${sessionId}`)
    
    return NextResponse.json({
      success: true,
      orders: stored.orders,
      count: stored.orders.length,
      period: stored.period,
      receivedAt: new Date(stored.receivedAt).toISOString()
    })
  } catch (error) {
    console.error('[Pending Orders API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
