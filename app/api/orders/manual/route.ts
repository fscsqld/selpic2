import { NextResponse } from 'next/server'
import type { OrderRecord } from '@/lib/store'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'
import { sanitizeStorefrontBankOrderDraft, type BankOrderDraft } from '@/lib/orders/sanitizeStorefrontBankOrderDraft'

export async function POST(req: Request) {
  const gate = await requireAdminPermission('orders:write')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured.' }, { status: 503 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const orderDraft = body?.orderDraft as BankOrderDraft | undefined
    if (!orderDraft || typeof orderDraft !== 'object') {
      return NextResponse.json({ error: 'Invalid order draft.' }, { status: 400 })
    }

    const sanitizedDraft = await sanitizeStorefrontBankOrderDraft(orderDraft)
    const id = `ORD-${Date.now().toString(36)}`
    const order: OrderRecord = {
      id,
      createdAtIso: new Date().toISOString(),
      ...sanitizedDraft,
      status: 'pending',
      paymentMethod: 'bank',
      paymentMethodName: sanitizedDraft.paymentMethodName || 'Bank Transfer',
      platformSource: 'website',
    }

    const sb = getSupabaseAdmin()
    const { error } = await sb.from('orders').insert({
      id: order.id,
      ...buildOrdersTableUpdate(order),
    })
    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, order })
  } catch (e) {
    logAndSafeMessage('orders/manual POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
