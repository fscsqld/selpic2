import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord, OrderStatus } from '@/lib/store'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

type RouteContext = { params: Promise<{ orderId: string }> }

const PATCHABLE_STATUSES: OrderStatus[] = ['processing', 'shipped']

/** Single order from Supabase ledger (admin only). */
export async function GET(_request: Request, context: RouteContext) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await context.params
  if (!orderId?.trim()) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured' }, { status: 503 })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('orders').select('payload').eq('id', orderId.trim()).maybeSingle()

    if (error) {
      logAndSafeMessage('orders/orderId GET', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    if (!data?.payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const order = normalizeLedgerOrder(data.payload as OrderRecord)
    return NextResponse.json({ order })
  } catch (e) {
    logAndSafeMessage('orders/orderId GET catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Update order payload status in Supabase (no customer emails — do not use client store updateOrderStatus). */
export async function PATCH(request: Request, context: RouteContext) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await context.params
  if (!orderId?.trim()) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured' }, { status: 503 })
  }

  let body: { status?: OrderStatus; performedBy?: string }
  try {
    body = (await request.json()) as { status?: OrderStatus; performedBy?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const nextStatus = body?.status
  const performedBy = (body?.performedBy || 'admin').slice(0, 80)

  if (!nextStatus || !PATCHABLE_STATUSES.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${PATCHABLE_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const sb = getSupabaseAdmin()
    const { data: row, error: selErr } = await sb
      .from('orders')
      .select('payload')
      .eq('id', orderId.trim())
      .maybeSingle()

    if (selErr) {
      logAndSafeMessage('orders/orderId PATCH select', selErr)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    if (!row?.payload) {
      return NextResponse.json({ error: 'Order not found in ledger' }, { status: 404 })
    }

    const previous = row.payload as OrderRecord
    if (previous.status === nextStatus) {
      const order = normalizeLedgerOrder(previous)
      return NextResponse.json({ order })
    }

    const auditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      action: 'status_changed' as const,
      performedBy,
      changes: [
        {
          field: 'status',
          oldValue: previous.status,
          newValue: nextStatus,
        },
      ],
      description: `Order status changed from ${previous.status} to ${nextStatus} (server)`,
    }

    const updated: OrderRecord = normalizeLedgerOrder({
      ...previous,
      status: nextStatus,
      auditLog: [...(previous.auditLog || []), auditEntry],
    })

    const { error: upErr } = await sb.from('orders').update({ payload: updated }).eq('id', orderId.trim())

    if (upErr) {
      logAndSafeMessage('orders/orderId PATCH update', upErr)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ order: updated })
  } catch (e) {
    logAndSafeMessage('orders/orderId PATCH catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
