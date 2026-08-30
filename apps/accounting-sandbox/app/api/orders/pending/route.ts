/**
 * Get Pending Orders API — soft-retired (always empty; import no longer saves).
 */

import { NextResponse } from 'next/server'
import { INCOMING_ORDERS_RETIRED_NOTE } from '@/lib/orders/incoming-orders-retired'

/**
 * GET /api/orders/pending
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    retired: true,
    orders: [],
    count: 0,
    message: INCOMING_ORDERS_RETIRED_NOTE,
  })
}
