/**
 * Order Import API (Proxy) — soft-retired
 *
 * Formerly forwarded storefront orders to accounting-sandbox.
 * Revenue is recorded from bank statements in the accounting app, not from
 * homepage order gross amounts (avoids double-count vs Stripe net payouts).
 *
 * Returns 200 without calling ACCOUNTING_API_URL so order approval never
 * depends on the accounting app being online.
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

const RETIRED_NOTE =
  'Order import into accounting is retired. Record sales from bank statement deposits (e.g. Stripe payouts), not homepage orders.'

/**
 * POST /api/accounting/orders/import — accepted but not forwarded.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as OrderImportRequest | null
    const orderCount = Array.isArray(body?.orders) ? body!.orders.length : 0

    console.info(
      `[Accounting Proxy] retired no-op (ignored ${orderCount} order(s)): ${RETIRED_NOTE}`
    )

    return NextResponse.json({
      success: true,
      retired: true,
      message: RETIRED_NOTE,
      importedCount: 0,
      savedCount: 0,
      skippedCount: orderCount,
      orders: [],
      period: body?.period,
      note: RETIRED_NOTE,
    })
  } catch (error) {
    console.error('[Accounting Proxy] Error:', error)
    // Still succeed — callers must never block on accounting
    return NextResponse.json({
      success: true,
      retired: true,
      message: RETIRED_NOTE,
      importedCount: 0,
      savedCount: 0,
      skippedCount: 0,
      orders: [],
      note: RETIRED_NOTE,
    })
  }
}
