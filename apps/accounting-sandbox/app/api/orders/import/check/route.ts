/**
 * Check for Pending Orders API — soft-retired (always empty).
 */

import { NextResponse } from 'next/server'
import { INCOMING_ORDERS_RETIRED_NOTE } from '@/lib/orders/incoming-orders-retired'

export async function GET() {
  return NextResponse.json({
    success: true,
    retired: true,
    orders: [],
    message: INCOMING_ORDERS_RETIRED_NOTE,
  })
}
