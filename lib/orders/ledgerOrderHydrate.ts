import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderPlatformSource, OrderRecord } from '@/lib/store'
import { ORDER_PLATFORM_SOURCES } from '@/lib/store'

export type OrderLedgerRow = {
  payload: OrderRecord
  platform_source?: string | null
  external_order_key?: string | null
}

function coercePlatform(value: string | null | undefined): OrderPlatformSource | undefined {
  if (!value) return undefined
  const v = value.trim().toLowerCase() as OrderPlatformSource
  return ORDER_PLATFORM_SOURCES.includes(v) ? v : undefined
}

/** Merge indexed DB columns into payload for admin + client consistency. */
export function hydrateLedgerOrder(row: OrderLedgerRow): OrderRecord {
  const base = normalizeLedgerOrder(row.payload as OrderRecord)
  const fromColumn = coercePlatform(row.platform_source ?? undefined)
  const platformSource = base.platformSource ?? fromColumn ?? 'website'
  const externalOrderKey = base.externalOrderKey ?? (row.external_order_key || undefined) ?? undefined
  return {
    ...base,
    platformSource,
    externalOrderKey,
  }
}
