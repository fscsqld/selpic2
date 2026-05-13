import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getValidEtsyAccessToken } from '@/lib/integrations/etsy/etsyAccessToken'
import { fetchShopReceipt, fetchShopReceipts } from '@/lib/integrations/etsy/etsyOrdersClient'
import { getMarketplaceOrderAdapter } from '@/lib/orderSources/registry'
import { upsertMarketplaceOrderRow } from '@/lib/orders/marketplaceOrderLedger'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

/**
 * Import Etsy receipts into `orders`.
 * Default: paid + not yet shipped ("open" for fulfillment). Set `openOnly: false` to include shipped receipts.
 */
export async function POST(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adapter = getMarketplaceOrderAdapter('etsy')
  if (!adapter) {
    return NextResponse.json({ error: 'Etsy adapter not registered.' }, { status: 500 })
  }

  let sinceDays = 90
  let openOnly = true
  try {
    const body = (await request.json().catch(() => ({}))) as { sinceDays?: number; openOnly?: boolean }
    if (typeof body.sinceDays === 'number' && body.sinceDays > 0 && body.sinceDays <= 180) {
      sinceDays = body.sinceDays
    }
    if (typeof body.openOnly === 'boolean') {
      openOnly = body.openOnly
    }
  } catch {
    /* defaults */
  }

  try {
    const { accessToken, apiKey, shopId } = await getValidEtsyAccessToken()
    const minCreated = Math.floor((Date.now() - sinceDays * 86400000) / 1000)
    const query: Record<string, string> = {
      limit: '100',
      offset: '0',
      was_paid: 'true',
      min_created: String(minCreated),
    }
    if (openOnly) {
      query.was_shipped = 'false'
    }

    const list = await fetchShopReceipts(shopId, accessToken, apiKey, query)
    const results = Array.isArray(list.results) ? list.results : []
    let imported = 0
    for (const raw of results) {
      const rec = raw as Record<string, unknown>
      const rid = typeof rec.receipt_id === 'number' ? rec.receipt_id : Number(rec.receipt_id)
      if (!Number.isFinite(rid)) continue
      let full: Record<string, unknown> = rec
      const txs = rec.transactions
      if (!Array.isArray(txs) || txs.length === 0) {
        full = await fetchShopReceipt(shopId, rid, accessToken, apiKey)
      }
      const normalized = adapter.mapRemoteToNormalized({ shopId: Number(shopId), receipt: full })
      const order = adapter.toOrderRecord(normalized)
      await upsertMarketplaceOrderRow(order)
      imported++
    }
    return NextResponse.json({
      ok: true,
      imported,
      scanned: results.length,
      sinceDays,
      openOnly,
    })
  } catch (e) {
    logAndSafeMessage('etsy sync POST', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
