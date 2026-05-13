import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { OrderRecord } from '@/lib/store'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import { hydrateLedgerOrder } from '@/lib/orders/ledgerOrderHydrate'
import { buildOrdersTableUpdate } from '@/lib/orders/orderDbColumns'

/** Upsert marketplace order by external_order_key (stable id + idempotent sync). */
export async function upsertMarketplaceOrderRow(order: OrderRecord): Promise<OrderRecord> {
  const sb = getSupabaseAdmin()
  const key = order.externalOrderKey?.trim()
  if (!key) {
    throw new Error('Marketplace order requires externalOrderKey')
  }

  const payload: OrderRecord = normalizeLedgerOrder({
    ...order,
    platformSource: order.platformSource ?? 'etsy',
    externalOrderKey: key,
  })

  const { data: existing, error: selErr } = await sb
    .from('orders')
    .select('id,payload,platform_source,external_order_key')
    .eq('external_order_key', key)
    .maybeSingle()

  if (selErr) {
    throw new Error(selErr.message)
  }

  const row = {
    id: order.id,
    ...buildOrdersTableUpdate(payload),
  }

  if (existing?.id) {
    const { error: upErr } = await sb.from('orders').update(row).eq('id', existing.id as string)
    if (upErr) throw new Error(upErr.message)
    const { data: reread } = await sb
      .from('orders')
      .select('payload,platform_source,external_order_key')
      .eq('id', existing.id as string)
      .maybeSingle()
    if (reread) return hydrateLedgerOrder(reread as Parameters<typeof hydrateLedgerOrder>[0])
    return payload
  }

  const { error: insErr } = await sb.from('orders').insert(row)
  if (insErr) {
    const { data: race } = await sb
      .from('orders')
      .select('payload,platform_source,external_order_key')
      .eq('external_order_key', key)
      .maybeSingle()
    if (race) return hydrateLedgerOrder(race as Parameters<typeof hydrateLedgerOrder>[0])
    throw new Error(insErr.message)
  }

  return payload
}
