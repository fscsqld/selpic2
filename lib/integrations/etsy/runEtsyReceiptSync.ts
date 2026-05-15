import 'server-only'

import { getEtsyConnection } from '@/lib/integrations/etsy/etsyConnectionStore'
import { getValidEtsyAccessToken } from '@/lib/integrations/etsy/etsyAccessToken'
import { fetchShopReceipt, fetchShopReceipts } from '@/lib/integrations/etsy/etsyOrdersClient'
import { getMarketplaceOrderAdapter } from '@/lib/orderSources/registry'
import { upsertMarketplaceOrderRow } from '@/lib/orders/marketplaceOrderLedger'

export type EtsyReceiptSyncResult =
  | {
      ok: true
      skipped: true
      reason: 'no_connection'
      imported: 0
      scanned: 0
      sinceDays: number
      openOnly: boolean
    }
  | {
      ok: true
      skipped: false
      imported: number
      scanned: number
      sinceDays: number
      openOnly: boolean
    }

/**
 * Pull paid Etsy receipts into the unified `orders` ledger (same rules as admin POST sync).
 * Used by `/api/admin/integrations/etsy/sync` and Vercel Cron.
 */
export async function runEtsyReceiptSync(params: {
  sinceDays: number
  openOnly: boolean
}): Promise<EtsyReceiptSyncResult> {
  const adapter = getMarketplaceOrderAdapter('etsy')
  if (!adapter) {
    throw new Error('Etsy adapter not registered.')
  }

  const conn = await getEtsyConnection()
  if (!conn) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_connection',
      imported: 0,
      scanned: 0,
      sinceDays: params.sinceDays,
      openOnly: params.openOnly,
    }
  }

  const { accessToken, apiKey, shopId } = await getValidEtsyAccessToken()
  const minCreated = Math.floor((Date.now() - params.sinceDays * 86400000) / 1000)
  const query: Record<string, string> = {
    limit: '100',
    offset: '0',
    was_paid: 'true',
    min_created: String(minCreated),
  }
  if (params.openOnly) {
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

  return {
    ok: true,
    skipped: false,
    imported,
    scanned: results.length,
    sinceDays: params.sinceDays,
    openOnly: params.openOnly,
  }
}
