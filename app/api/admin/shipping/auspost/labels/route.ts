import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'
import {
  AVERY_L7169_LABELS_PER_PAGE,
  buildAdminShippingLabelsBatchPdfBase64,
} from '@/lib/shipping/buildAdminShippingLabelPdf'

/** Barcode + PDF generation require Node APIs (`bwip-js/node`, `Buffer`). */
export const runtime = 'nodejs'

const MAX_BATCH = 40

function isClickAndCollect(order: OrderRecord): boolean {
  return (
    order.shippingOptionId === 'local-pickup' ||
    order.shippingOptionId === 'click-collect-mansfield' ||
    Boolean(order.shippingOptionName?.toLowerCase().includes('click & collect'))
  )
}

async function loadOrdersByIds(orderIds: string[]): Promise<OrderRecord[]> {
  const sb = getSupabaseAdmin()
  const unique = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))]
  if (!unique.length) return []

  const { data, error } = await sb.from('orders').select('id, payload').in('id', unique)
  if (error) {
    throw new Error(error.message)
  }

  const byId = new Map<string, OrderRecord>()
  for (const row of data || []) {
    if (!row?.payload) continue
    const order = normalizeLedgerOrder(row.payload as OrderRecord)
    byId.set(order.id, order)
  }

  // Preserve request order
  return unique.map((id) => byId.get(id)).filter((o): o is OrderRecord => Boolean(o))
}

async function saveOrder(order: OrderRecord): Promise<void> {
  const sb = getSupabaseAdmin()
  const row = buildOrdersTableUpdate(order)
  const { error } = await sb.from('orders').update(row).eq('id', order.id)
  if (!error) return

  const { error: payloadOnlyError } = await sb
    .from('orders')
    .update({ payload: row.payload })
    .eq('id', order.id)

  if (payloadOnlyError) {
    throw new Error(
      `orders update failed: ${error.message}. Payload-only fallback: ${payloadOnlyError.message}`
    )
  }
}

function performedByFromUser(user: NonNullable<Awaited<ReturnType<typeof requireSupabaseAdminUser>>>) {
  return (user.email || user.user_metadata?.full_name || user.id || 'admin').slice(0, 120)
}

/**
 * Batch internal Avery L7169 shipping labels (4 per A4 page).
 * Skips Click & Collect orders; returns counts so the UI can explain.
 */
export async function POST(request: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured' }, { status: 503 })
  }

  let body: { orderIds?: string[]; markCreated?: boolean }
  try {
    body = (await request.json()) as { orderIds?: string[]; markCreated?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawIds = Array.isArray(body.orderIds) ? body.orderIds.map(String) : []
  if (!rawIds.length) {
    return NextResponse.json({ error: 'Missing orderIds' }, { status: 400 })
  }
  if (rawIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Too many orders (max ${MAX_BATCH} per batch).` },
      { status: 400 }
    )
  }

  try {
    const loaded = await loadOrdersByIds(rawIds)
    const skippedMissing = rawIds.length - loaded.length
    const printable: OrderRecord[] = []
    const skippedClickCollect: string[] = []

    for (const order of loaded) {
      if (isClickAndCollect(order)) {
        skippedClickCollect.push(order.id)
        continue
      }
      printable.push(order)
    }

    if (!printable.length) {
      return NextResponse.json(
        {
          error: 'No printable shipping labels in this selection (Click & Collect or missing orders).',
          skippedClickCollect,
          skippedMissing,
        },
        { status: 400 }
      )
    }

    const { pdfBase64, pageCount, labelCount } = await buildAdminShippingLabelsBatchPdfBase64(printable)

    const markCreated = body.markCreated !== false
    const performedBy = performedByFromUser(adminUser)
    const now = new Date().toISOString()
    const updatedOrders: OrderRecord[] = []

    if (markCreated) {
      for (const order of printable) {
        const existing = order.ausPostShippingLabel
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          timestamp: now,
          action: 'shipping_updated' as const,
          performedBy,
          description: `Shipping labels batch PDF (${labelCount} labels / ${pageCount} A4 sheets)`,
        }
        const updated = normalizeLedgerOrder({
          ...order,
          ausPostShippingLabel: {
            status: 'created',
            mode: 'internal',
            createdAtIso: existing?.createdAtIso ?? now,
            updatedAtIso: now,
            lastError: undefined,
          },
          auditLog: [...(order.auditLog || []), auditEntry],
        })
        await saveOrder(updated)
        updatedOrders.push(updated)
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'internal' as const,
      layout: 'avery-l7169' as const,
      labelsPerPage: AVERY_L7169_LABELS_PER_PAGE,
      labelCount,
      pageCount,
      skippedClickCollect,
      skippedMissing,
      orders: updatedOrders.length ? updatedOrders : printable,
      pdfBase64,
    })
  } catch (e) {
    logAndSafeMessage('admin shipping auspost labels POST', e)
    const devDetail =
      process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: devDetail }, { status: 500 })
  }
}
