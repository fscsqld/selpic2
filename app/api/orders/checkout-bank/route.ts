import { NextResponse } from 'next/server'
import type { OrderRecord } from '@/lib/store'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'
import { sanitizeStorefrontBankOrderDraft, type BankOrderDraft } from '@/lib/orders/sanitizeStorefrontBankOrderDraft'
import { notifyAdminsOfNewOrder } from '@/lib/server/adminInboundNotify'

/**
 * Storefront bank-transfer checkout: same catalog/total validation as admin manual orders,
 * but no Supabase admin session required (insert uses service_role).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured.' }, { status: 503 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const orderDraft = body?.orderDraft as BankOrderDraft | undefined
    if (!orderDraft || typeof orderDraft !== 'object') {
      return NextResponse.json({ error: 'Invalid order draft.' }, { status: 400 })
    }

    let sanitizedDraft: BankOrderDraft
    try {
      sanitizedDraft = await sanitizeStorefrontBankOrderDraft(orderDraft)
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Invalid order.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
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

    // Await Resend before responding — same as Contact/Bespoke.
    // `void notify` was dropped after the handler returned on serverless (ORD-mui1en1q).
    let adminNotifyOk = false
    let adminNotifyError: string | undefined
    try {
      const notifyResult = await notifyAdminsOfNewOrder(order)
      adminNotifyOk = Boolean(notifyResult?.ok)
      if (!notifyResult?.ok) {
        adminNotifyError = notifyResult?.logMessage || 'Admin notify failed'
        console.warn('[checkout-bank] admin notify failed:', adminNotifyError)
      }
    } catch (err) {
      adminNotifyError = err instanceof Error ? err.message : 'Admin notify failed'
      console.warn('[checkout-bank] admin notify threw:', adminNotifyError)
    }

    return NextResponse.json({
      success: true,
      order,
      adminNotifyOk,
      ...(adminNotifyError ? { adminNotifyError } : {}),
    })
  } catch (e) {
    logAndSafeMessage('orders/checkout-bank POST', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
