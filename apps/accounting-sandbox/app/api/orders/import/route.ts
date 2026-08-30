/**
 * Order Import API (soft-retired)
 *
 * Homepage used to POST orders here for Incoming Orders / synthetic income.
 * Revenue SSOT is now bank-statement deposits (e.g. Stripe net payouts).
 * Keep the route as a 200 no-op so storefront bridges and connection tests never 500.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  INCOMING_ORDERS_RETIRED_NOTE,
} from '@/lib/orders/incoming-orders-retired'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

interface OrderImportData {
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

interface OrderImportRequest {
  orders: OrderImportData[]
  period: {
    startDate: string
    endDate: string
  }
}

/**
 * POST /api/orders/import — accepted but not persisted.
 */
export async function POST(request: NextRequest) {
  let orderCount = 0
  try {
    const body = (await request.json().catch(() => null)) as OrderImportRequest | null
    orderCount = Array.isArray(body?.orders) ? body!.orders.length : 0
  } catch {
    // ignore malformed body — still return 200 retired
  }

  console.info(
    `[Order Import API] retired no-op (ignored ${orderCount} order(s)): ${INCOMING_ORDERS_RETIRED_NOTE}`
  )

  return NextResponse.json(
    {
      success: true,
      retired: true,
      message: INCOMING_ORDERS_RETIRED_NOTE,
      savedCount: 0,
      skippedCount: orderCount,
      importedCount: 0,
      orders: [],
      note: INCOMING_ORDERS_RETIRED_NOTE,
    },
    { headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}
