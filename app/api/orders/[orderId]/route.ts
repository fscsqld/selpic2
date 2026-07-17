import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord, OrderStatus } from '@/lib/store'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { hydrateLedgerOrder } from '@/lib/orders/ledgerOrderHydrate'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'
import { orderRequiresTrackingNumber, isOrderClickAndCollect } from '@/lib/shipping/shippingSnapshot'
import { sendShippingNotificationEmailForOrder } from '@/lib/server/shippingNotificationEmail'

type RouteContext = { params: Promise<{ orderId: string }> }

const PATCHABLE_STATUSES: OrderStatus[] = [
  'pending',
  'approved',
  'paid',
  'processing',
  'shipped',
  'cancelled',
  'ready_for_collection',
  'collected',
]

/** Statuses that send the one-time dispatch / ready-for-collection email. */
function statusSendsDispatchEmail(status: OrderStatus): boolean {
  return status === 'shipped' || status === 'ready_for_collection'
}

async function sendDispatchAndPersist(
  sb: ReturnType<typeof getSupabaseAdmin>,
  order: OrderRecord
): Promise<{ order: OrderRecord; warning?: string }> {
  if (order.shippingNotification?.sent) return { order }

  const result = await sendShippingNotificationEmailForOrder(order)
  const now = new Date().toISOString()
  const withNotification: OrderRecord = normalizeLedgerOrder({
    ...order,
    shippingNotification: result.ok
      ? {
          sent: true,
          sentAt: result.sentAt,
          attempts: order.shippingNotification?.attempts || 1,
          status: 'sent',
          lastAttempt: now,
        }
      : {
          sent: false,
          attempts: order.shippingNotification?.attempts || 1,
          status: 'failed',
          lastAttempt: now,
          errorMessage: result.error,
        },
  })

  const { error } = await sb
    .from('orders')
    .update(buildOrdersTableUpdate(withNotification))
    .eq('id', order.id)
  if (error) {
    logAndSafeMessage('orders/orderId PATCH notification persist', error)
    return {
      order: withNotification,
      warning: result.ok
        ? 'Dispatch email was sent, but its sent status could not be saved.'
        : 'Order was marked shipped, but dispatch email failed and its status could not be saved.',
    }
  }

  return result.ok
    ? { order: withNotification }
    : {
        order: withNotification,
        warning: 'Order was marked shipped, but the dispatch email could not be sent. Retry by saving Shipped again.',
      }
}

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
    const { data, error } = await sb
      .from('orders')
      .select('payload,platform_source,external_order_key')
      .eq('id', orderId.trim())
      .maybeSingle()

    if (error) {
      logAndSafeMessage('orders/orderId GET', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    if (!data?.payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const order = hydrateLedgerOrder(data as Parameters<typeof hydrateLedgerOrder>[0])
    return NextResponse.json({ order })
  } catch (e) {
    logAndSafeMessage('orders/orderId GET catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/**
 * Update canonical order status.
 * The first transition to shipped or ready_for_collection sends and records one dispatch notification.
 */
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
      .select('payload,platform_source,external_order_key')
      .eq('id', orderId.trim())
      .maybeSingle()

    if (selErr) {
      logAndSafeMessage('orders/orderId PATCH select', selErr)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    if (!row?.payload) {
      return NextResponse.json({ error: 'Order not found in ledger' }, { status: 404 })
    }

    const previous = hydrateLedgerOrder(row as Parameters<typeof hydrateLedgerOrder>[0])
    if (previous.status === nextStatus) {
      if (
        statusSendsDispatchEmail(nextStatus) &&
        !previous.shippingNotification?.sent &&
        previous.shippingNotification?.status !== 'sending'
      ) {
        const now = new Date().toISOString()
        const retrying: OrderRecord = normalizeLedgerOrder({
          ...previous,
          shippingNotification: {
            sent: false,
            attempts: (previous.shippingNotification?.attempts || 0) + 1,
            status: 'sending',
            lastAttempt: now,
          },
        })
        const { error: retryClaimError } = await sb
          .from('orders')
          .update(buildOrdersTableUpdate(retrying))
          .eq('id', orderId.trim())
        if (retryClaimError) {
          logAndSafeMessage('orders/orderId PATCH retry claim', retryClaimError)
          return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
        }
        const retried = await sendDispatchAndPersist(sb, retrying)
        return NextResponse.json(retried)
      }
      const order = normalizeLedgerOrder(previous)
      return NextResponse.json({ order })
    }

    if (
      (nextStatus === 'ready_for_collection' || nextStatus === 'collected') &&
      !isOrderClickAndCollect(previous)
    ) {
      return NextResponse.json(
        {
          error:
            'Ready for collection / Collected statuses are only for Click & Collect orders.',
        },
        { status: 400 }
      )
    }

    if (
      nextStatus === 'shipped' &&
      orderRequiresTrackingNumber(previous) &&
      !(previous.tracking?.number || '').trim()
    ) {
      return NextResponse.json(
        {
          error:
            'This order uses tracked shipping. Add a tracking number before marking it as shipped.',
        },
        { status: 400 }
      )
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

    const now = new Date().toISOString()
    const updated: OrderRecord = normalizeLedgerOrder({
      ...previous,
      status: nextStatus,
      auditLog: [...(previous.auditLog || []), auditEntry],
      ...(statusSendsDispatchEmail(nextStatus) && !previous.shippingNotification?.sent
        ? {
            shippingNotification: {
              sent: false,
              attempts: (previous.shippingNotification?.attempts || 0) + 1,
              status: 'sending' as const,
              lastAttempt: now,
            },
          }
        : {}),
    })

    // Claim the status transition against the canonical payload. This prevents
    // list/detail tabs from both sending the same dispatch email.
    const { data: claimedRow, error: upErr } = await sb
      .from('orders')
      .update(buildOrdersTableUpdate(updated))
      .eq('id', orderId.trim())
      .contains('payload', { status: previous.status })
      .select('payload,platform_source,external_order_key')
      .maybeSingle()

    if (upErr) {
      logAndSafeMessage('orders/orderId PATCH update', upErr)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    if (!claimedRow?.payload) {
      const { data: canonicalRow, error: canonicalError } = await sb
        .from('orders')
        .select('payload,platform_source,external_order_key')
        .eq('id', orderId.trim())
        .maybeSingle()
      if (canonicalError || !canonicalRow?.payload) {
        if (canonicalError) {
          logAndSafeMessage('orders/orderId PATCH canonical read', canonicalError)
        }
        return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
      }
      return NextResponse.json({
        order: hydrateLedgerOrder(
          canonicalRow as Parameters<typeof hydrateLedgerOrder>[0]
        ),
        warning: 'Order status was already changed in another session.',
      })
    }

    if (statusSendsDispatchEmail(nextStatus)) {
      const dispatched = await sendDispatchAndPersist(sb, updated)
      return NextResponse.json(dispatched)
    }

    return NextResponse.json({ order: updated })
  } catch (e) {
    logAndSafeMessage('orders/orderId PATCH catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Replace order payload in Supabase ledger (admin only). */
export async function PUT(request: Request, context: RouteContext) {
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

  let body: { order?: OrderRecord }
  try {
    body = (await request.json()) as { order?: OrderRecord }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const incoming = body?.order
  if (!incoming || typeof incoming !== 'object') {
    return NextResponse.json({ error: 'Missing order payload' }, { status: 400 })
  }

    const sanitized = normalizeLedgerOrder(incoming)
    if (!sanitized.id || sanitized.id !== orderId.trim()) {
      return NextResponse.json({ error: 'Order id mismatch' }, { status: 400 })
    }

    try {
      const sb = getSupabaseAdmin()
      const { error } = await sb.from('orders').update(buildOrdersTableUpdate(sanitized)).eq('id', orderId.trim())
    if (error) {
      logAndSafeMessage('orders/orderId PUT update', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ order: sanitized })
  } catch (e) {
    logAndSafeMessage('orders/orderId PUT catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Remove a row from the Supabase ledger (admin only). Client store must also drop the order locally. */
export async function DELETE(_request: Request, context: RouteContext) {
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
    const { error } = await sb.from('orders').delete().eq('id', orderId.trim())

    if (error) {
      logAndSafeMessage('orders/orderId DELETE', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    logAndSafeMessage('orders/orderId DELETE catch', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
