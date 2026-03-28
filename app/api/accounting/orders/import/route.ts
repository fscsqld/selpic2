/**
 * Order Import API (Proxy to Accounting Program)
 * 
 * SELPIC 홈페이지에서 주문 데이터를 회계 프로그램으로 전송하는 프록시 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'

export interface OrderImportData {
  orderId: string
  orderDate: string
  customerName: string
  customerEmail: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  gst: number
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
    startDate: string
    endDate: string
  }
}

/**
 * POST /api/accounting/orders/import
 * 주문 데이터를 회계 프로그램으로 전송 (프록시)
 */
export async function POST(request: NextRequest) {
  try {
    const body: OrderImportRequest = await request.json()
    
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

    // 회계 프로그램 API 엔드포인트 (로컬 개발 환경)
    // 프로덕션에서는 환경 변수로 관리
    const accountingApiUrl = process.env.ACCOUNTING_API_URL || 'http://localhost:3001'
    const accountingEndpoint = `${accountingApiUrl}/api/orders/import`

    console.log('[Accounting Proxy] Forwarding request to:', accountingEndpoint)
    console.log('[Accounting Proxy] Orders count:', body.orders.length)

    try {
      // 회계 프로그램으로 전송
      const response = await fetch(accountingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      console.log('[Accounting Proxy] Response status:', response.status)

      const result = await response.json()
      console.log('[Accounting Proxy] Response data:', result)

      if (response.ok) {
        // 회계 프로그램 API는 orders 배열을 반환
        // 클라이언트에서 localStorage에 저장하고, 회계 프로그램이 읽어서 IndexedDB에 저장
        const ordersToSave = result.orders || []
        
        return NextResponse.json({
          success: true,
          message: result.message || 'Orders sent successfully',
          importedCount: ordersToSave.length || body.orders.length,
          savedCount: ordersToSave.length || 0,
          skippedCount: result.skippedCount || 0,
          orders: ordersToSave, // 클라이언트에서 localStorage에 저장할 데이터
          period: body.period,
          note: result.note || 'Orders will be saved to Inbox on client side. Please open the accounting program to process them.'
        })
      } else {
        console.error('[Accounting Proxy] Error response:', result)
        return NextResponse.json(
          { 
            error: result.error || 'Failed to send orders to accounting program',
            details: result.details 
          },
          { status: response.status }
        )
      }
    } catch (fetchError) {
      console.error('[Accounting Proxy] Fetch error:', fetchError)
      console.error('[Accounting Proxy] Error type:', fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError)
      console.error('[Accounting Proxy] Error message:', fetchError instanceof Error ? fetchError.message : String(fetchError))
      
      // 회계 프로그램이 실행되지 않은 경우를 위한 안내 메시지
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('fetch failed') || 
            fetchError.message.includes('ECONNREFUSED') ||
            fetchError.message.includes('ERR_CONNECTION_REFUSED') ||
            fetchError.message.includes('ECONNREFUSED')) {
          return NextResponse.json(
            { 
              error: 'Accounting program is not running',
              details: `Cannot connect to ${accountingEndpoint}. Please make sure the accounting program is running on port 3001`,
              suggestion: 'Start the accounting program with: cd apps/accounting-sandbox && npm run dev'
            },
            { status: 503 }
          )
        }
        
        if (fetchError.message.includes('404') || fetchError.message.includes('Not Found')) {
          return NextResponse.json(
            { 
              error: 'API endpoint not found',
              details: `The endpoint ${accountingEndpoint} does not exist. Please check if the route file exists.`,
              suggestion: 'Verify that apps/accounting-sandbox/app/api/orders/import/route.ts exists'
            },
            { status: 404 }
          )
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to connect to accounting program', 
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          suggestion: 'Check server logs for more details'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Accounting Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
