import type { OrderRecord } from '@/lib/store'

export type NetSalesOrderRow = {
  orderId: string
  date: string
  customerName: string
  promoCode: string
  subtotal: number
  shipping: number
  total: number
  commission: number
  excluded: boolean
  excludeReason?: string
}

function orderStatus(order: OrderRecord): string {
  return String((order as any).status || (order as any).paymentStatus || '').toLowerCase()
}

function isExcludedOrder(order: OrderRecord): { excluded: boolean; reason?: string } {
  const status = orderStatus(order)
  if (status.includes('cancel')) return { excluded: true, reason: 'Cancelled' }
  if (status.includes('refund')) return { excluded: true, reason: 'Refunded' }
  return { excluded: false }
}

/**
 * Net Sales engine (fundraising only — does not modify checkout/promo).
 * Net Sales = sum(subtotal) for included orders with matching promo code.
 * Shipping and payment fees are excluded by using subtotal.
 */
export function computeFundraisingNetSales(input: {
  orders: OrderRecord[]
  promoCode: string
  periodStartIso: string
  periodEndIso: string
  donationRatePercent: number
}): {
  orderRows: NetSalesOrderRow[]
  orderCount: number
  grossSales: number
  netSales: number
  commissionAmount: number
} {
  const code = input.promoCode.trim().toUpperCase()
  const start = new Date(input.periodStartIso).getTime()
  const end = new Date(input.periodEndIso).getTime()
  const rate = input.donationRatePercent / 100

  const orderRows: NetSalesOrderRow[] = []
  let grossSales = 0
  let netSales = 0

  for (const order of input.orders) {
    const orderCode = String(order.promoCode || '').trim().toUpperCase()
    if (!orderCode || orderCode !== code) continue

    const created = new Date(order.createdAtIso || (order as any).createdAt || 0).getTime()
    if (!Number.isFinite(created) || created < start || created > end) continue

    const subtotal = Number(order.subtotal) || 0
    const shipping = Number(order.shippingPrice ?? (order as any).shipping ?? 0) || 0
    const total = Number(order.total) || 0
    grossSales += subtotal + shipping

    const { excluded, reason } = isExcludedOrder(order)
    const commission = excluded ? 0 : subtotal * rate
    if (!excluded) netSales += subtotal

    orderRows.push({
      orderId: order.id,
      date: order.createdAtIso || '',
      customerName: order.customer?.name || order.customer?.email || 'Customer',
      promoCode: orderCode,
      subtotal,
      shipping,
      total,
      commission,
      excluded,
      excludeReason: reason,
    })
  }

  orderRows.sort((a, b) => b.date.localeCompare(a.date))
  const included = orderRows.filter((r) => !r.excluded)

  return {
    orderRows,
    orderCount: included.length,
    grossSales,
    netSales,
    commissionAmount: Math.round(netSales * rate * 100) / 100,
  }
}

export function periodBounds(periodYYYYMM: string): { startIso: string; endIso: string } {
  const [y, m] = periodYYYYMM.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export function currentPeriodYYYYMM(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
