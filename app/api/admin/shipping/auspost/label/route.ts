import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'
import { buildAdminShippingLabelPdfBase64 } from '@/lib/shipping/buildAdminShippingLabelPdf'

/** Barcode + PDF generation require Node APIs (`bwip-js/node`, `Buffer`). */
export const runtime = 'nodejs'

function isInternalLabelMode(mode: string | undefined): boolean {
  return mode === 'internal' || mode === 'mock'
}

async function loadOrder(orderId: string): Promise<OrderRecord | null> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.from('orders').select('payload').eq('id', orderId.trim()).maybeSingle()
  if (error || !data?.payload) return null
  return normalizeLedgerOrder(data.payload as OrderRecord)
}

/**
 * Persist order after label metadata change.
 * Tries full row sync first; falls back to `payload` only for older DBs (e.g. `stripe_checkout_session_id`
 * still NOT NULL, or `platform_source` column not migrated yet).
 */
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

/** Download PDF for orders that already have an internal label record. */
export async function GET(request: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured' }, { status: 503 })
  }

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim()
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  try {
    const order = await loadOrder(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const label = order.ausPostShippingLabel
    if (!label || label.status !== 'created') {
      return NextResponse.json(
        { error: 'No shipping label for this order. Generate one first.' },
        { status: 404 }
      )
    }

    if (label.mode === 'live') {
      if (label.labelUrl) {
        return NextResponse.json(
          { error: 'Live label URL delivery is not implemented yet. Open from AusPost or use internal label.' },
          { status: 501 }
        )
      }
      return NextResponse.json({ error: 'Live label not available for this order.' }, { status: 404 })
    }

    if (!isInternalLabelMode(label.mode)) {
      return NextResponse.json({ error: 'Unsupported label mode.' }, { status: 400 })
    }

    const pdfBase64 = await buildAdminShippingLabelPdfBase64(order)
    const buf = Buffer.from(pdfBase64, 'base64')
    const safeId = orderId.replace(/[^a-zA-Z0-9_-]+/g, '')
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shipping-label-${safeId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    logAndSafeMessage('admin shipping auspost label GET', e)
    const devDetail =
      process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: devDetail }, { status: 500 })
  }
}

/**
 * Create or refresh internal shipping label (PDF) and return base64 for preview/print.
 * Live AusPost Digital API labels remain a separate future path (`mode: 'live'`).
 */
export async function POST(request: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Order database not configured' }, { status: 503 })
  }

  let body: { orderId?: string; force?: boolean }
  try {
    body = (await request.json()) as { orderId?: string; force?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orderId = body?.orderId?.trim()
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  try {
    const order = await loadOrder(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const performedBy = performedByFromUser(adminUser)
    const now = new Date().toISOString()
    const force = Boolean(body.force)
    const existing = order.ausPostShippingLabel

    const isCached =
      !force && existing?.status === 'created' && isInternalLabelMode(existing.mode)

    const pdfBase64 = await buildAdminShippingLabelPdfBase64(order)

    if (isCached) {
      return NextResponse.json({
        ok: true,
        cached: true,
        mode: 'internal' as const,
        order,
        pdfBase64,
      })
    }

    const auditDescription =
      existing?.status === 'created' && force
        ? 'Shipping label (PDF) regenerated'
        : 'Shipping label (PDF) generated'

    const auditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: now,
      action: 'shipping_updated' as const,
      performedBy,
      description: auditDescription,
    }

    const updated: OrderRecord = normalizeLedgerOrder({
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

    return NextResponse.json({
      ok: true,
      cached: false,
      mode: 'internal' as const,
      order: updated,
      pdfBase64,
    })
  } catch (e) {
    logAndSafeMessage('admin shipping auspost label POST', e)
    const devDetail =
      process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: devDetail }, { status: 500 })
  }
}
