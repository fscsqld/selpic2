/**
 * Order Import API
 * 
 * SELPIC 홈페이지에서 주문 데이터를 회계 프로그램으로 전송하는 엔드포인트
 * 
 * 주의: IndexedDB는 클라이언트 사이드에서만 작동하므로,
 * 이 API는 데이터를 받아서 클라이언트에 반환하고,
 * 클라이언트에서 IndexedDB에 저장하도록 안내합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { savePendingOrders } from '../pending/route'

// 주문 데이터 인터페이스 (홈페이지에서 전송되는 형식)
export interface OrderImportData {
  orderId: string
  orderDate: string // ISO format
  customerName: string
  customerEmail: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  gst: number // GST 금액
  shipping: number
  discount?: number
  total: number
  paymentMethod: string
  status: string
  currency?: string
}

export interface OrderImportRequest {
  orders: OrderImportData[]
  period: {
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
  }
}

/**
 * POST /api/orders/import
 * 주문 데이터를 받아서 클라이언트에 전달
 * 클라이언트에서 IndexedDB에 저장하도록 데이터 반환
 */
export async function POST(request: NextRequest) {
  console.log('[Order Import API] ========================================')
  console.log('[Order Import API] Received request to import orders')
  console.log('[Order Import API] Request URL:', request.url)
  console.log('[Order Import API] Request method:', request.method)
  console.log('[Order Import API] Request headers:', Object.fromEntries(request.headers.entries()))
  console.log('[Order Import API] ========================================')
  
  try {
    const body: OrderImportRequest = await request.json()
    console.log('[Order Import API] Request body:', {
      ordersCount: body.orders?.length || 0,
      period: body.period
    })
    
    if (!body.orders || !Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: 'Invalid request: orders array is required' },
        { status: 400 }
      )
    }
    
    if (!body.period || !body.period.startDate || !body.period.endDate) {
      return NextResponse.json(
        { error: 'Invalid request: period (startDate, endDate) is required' },
        { status: 400 }
      )
    }
    
    // 필드 매핑: 홈페이지 데이터 → 회계 프로그램 필드
    const mappedOrders = body.orders.map((order) => {
      // payment_gateway → payment_method (Stripe/PayPal이면 수수료 자동 계산)
      const paymentGateway = order.paymentMethod === 'card' ? 'Stripe' : 
                            order.paymentMethod === 'paypal' ? 'PayPal' : 
                            order.paymentMethod === 'bank' ? 'Bank Transfer' : 
                            order.paymentMethod === 'cash' ? 'Cash' : 'Unknown'
      
      // total_paid → gross_amount (수수료 차감 전 전체 매출액)
      const grossAmount = order.total
      
      // gst_collected → gst_amount (GST Summary 리포트로 자동 분류)
      const gstAmount = order.gst || (order.total / 1.1 * 0.1) // GST가 없으면 계산
      
      // transaction_date → occurred_at (한 달 정산 기간 판단 기준)
      const occurredAt = order.orderDate
      
      // order_id → reference_no (감사 추적용 ID)
      const referenceNo = order.orderId
      
      return {
        orderId: order.orderId,
        referenceNo, // 감사 추적용 ID
        paymentGateway, // Stripe/PayPal 등
        paymentMethod: order.paymentMethod, // card, paypal, bank, cash
        totalPaid: order.total, // 고객이 실제로 지불한 금액
        grossAmount, // 수수료 차감 전 전체 매출액
        gstCollected: order.gst || 0, // 홈페이지에서 계산된 GST
        gstAmount, // GST Summary 리포트용
        transactionDate: order.orderDate.split('T')[0], // YYYY-MM-DD
        occurredAt, // 한 달 정산 기간 판단 기준
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        discount: order.discount || 0,
        status: order.status,
        currency: order.currency || 'AUD',
        rawData: order // 원본 데이터 저장
      }
    })
    
    console.log('[Order Import API] ========================================')
    console.log('[Order Import API] Mapped orders:', mappedOrders.length)
    console.log('[Order Import API] ========================================')

    // 🔧 CRITICAL: Save orders to pending store so client can fetch them
    const sessionId = request.headers.get('x-session-id') || `session_${Date.now()}`
    if (mappedOrders.length > 0) {
      savePendingOrders(sessionId, mappedOrders, body.period)
      console.log(`[Order Import API] ✅ Saved ${mappedOrders.length} orders to pending store (session: ${sessionId})`)
    }

    // 클라이언트에서 IndexedDB에 저장할 수 있도록 데이터 반환
    // CORS 헤더 추가
    return NextResponse.json({
      success: true,
      message: `Received ${mappedOrders.length} orders. Please save to IndexedDB on client side.`,
      savedCount: mappedOrders.length,
      skippedCount: 0,
      orders: mappedOrders, // 클라이언트에서 저장할 데이터
      period: body.period,
      sessionId, // 클라이언트가 나중에 이 세션 ID로 주문을 가져올 수 있음
      note: 'Orders will be saved to Inbox on client side. Please review and approve them in the Incoming Orders section.'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error('[Order Import] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
