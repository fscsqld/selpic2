import {
  NORMALIZED_ORDER_PLATFORM_LABEL,
  NORMALIZED_ORDER_PLATFORM_SOURCES,
  normalizeOrderPlatformSource,
  type NormalizedOrderPlatformSource,
} from './normalizeOrderPlatformSource'

export type OrderLikeForPlatformSales = {
  status?: string
  total?: number
  platformSource?: string | null
}

export type PlatformSalesRow = {
  platform: NormalizedOrderPlatformSource
  label: string
  revenue: number
  orders: number
  avgOrderValue: number
  sharePct: number
}

/** Aggregate non-cancelled order totals by sales channel (ops gross, not bank net). */
export function aggregateSalesByPlatform(orders: OrderLikeForPlatformSales[]): PlatformSalesRow[] {
  const buckets = new Map<NormalizedOrderPlatformSource, { revenue: number; orders: number }>()
  for (const id of NORMALIZED_ORDER_PLATFORM_SOURCES) {
    buckets.set(id, { revenue: 0, orders: 0 })
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue
    const platform = normalizeOrderPlatformSource(order.platformSource)
    const bucket = buckets.get(platform)!
    bucket.revenue += Number(order.total) || 0
    bucket.orders += 1
  }

  const rows = NORMALIZED_ORDER_PLATFORM_SOURCES.map((platform) => {
    const bucket = buckets.get(platform)!
    return {
      platform,
      label: NORMALIZED_ORDER_PLATFORM_LABEL[platform],
      revenue: bucket.revenue,
      orders: bucket.orders,
      avgOrderValue: bucket.orders > 0 ? bucket.revenue / bucket.orders : 0,
      sharePct: 0,
    }
  })

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  return rows.map((r) => ({
    ...r,
    sharePct: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
  }))
}
