import { listSydneyDaysInclusive, toSydneyDay } from '@/lib/analytics/sydney-day'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { hydrateLedgerOrder } from '@/lib/orders/ledgerOrderHydrate'
import type { OrderRecord } from '@/lib/store'

export type PerformanceOpportunitySeverity = 'high' | 'medium' | 'low'

export type PerformanceOpportunityId =
  | 'fundraising_stale_pending'
  | 'bank_transfer_pending'
  | 'traffic_up_conversion_flat'
  | 'revenue_week_down'

export type PerformanceOpportunity = {
  id: PerformanceOpportunityId
  severity: PerformanceOpportunitySeverity
  title: string
  summary: string
  metric?: string
  href: string
  actionLabel: string
  domain: 'fundraising' | 'sales' | 'traffic' | 'orders'
}

export type PerformanceCoachInputs = {
  stalePendingApps: Array<{ organizationName: string; daysPending: number }>
  bankPendingCount: number
  bankPendingTotalAud: number
  trafficRecent7: { pageviews: number; uniqueVisitors: number; orders: number }
  trafficPrior7: { pageviews: number; uniqueVisitors: number; orders: number }
  revenueThisWeekAud: number
  revenuePriorWeekAud: number
}

const MS_DAY = 24 * 60 * 60 * 1000
const STALE_PENDING_DAYS = 7

function sumDailyMetric(
  daily: Map<string, number>,
  days: string[]
): number {
  return days.reduce((acc, day) => acc + (daily.get(day) ?? 0), 0)
}

function orderRevenue(order: OrderRecord): number {
  if (order.status === 'cancelled') return 0
  const n = Number(order.total ?? order.subtotal ?? 0)
  return Number.isFinite(n) ? n : 0
}

function orderSydneyDay(order: OrderRecord): string {
  const raw = order.createdAtIso
  if (!raw) return ''
  return toSydneyDay(raw)
}

/** Pure builder — ranked opportunity cards (Wave 4 v1). No auto actions. */
export function buildPerformanceOpportunities(
  input: PerformanceCoachInputs,
  now: Date = new Date()
): PerformanceOpportunity[] {
  void now
  const cards: PerformanceOpportunity[] = []

  if (input.stalePendingApps.length > 0) {
    const n = input.stalePendingApps.length
    const oldest = Math.max(...input.stalePendingApps.map((a) => a.daysPending))
    const sample = input.stalePendingApps[0]?.organizationName
    cards.push({
      id: 'fundraising_stale_pending',
      severity: oldest >= 14 ? 'high' : 'medium',
      title: `${n} fundraising application${n === 1 ? '' : 's'} waiting > ${STALE_PENDING_DAYS} days`,
      summary: sample
        ? `Oldest includes “${sample}”. Review pending partners before they go cold.`
        : 'Review pending partner applications before they go cold.',
      metric: `Up to ${oldest} days pending`,
      href: '/admin/fundraising/partners?status=pending',
      actionLabel: 'Review pending partners',
      domain: 'fundraising',
    })
  }

  if (input.bankPendingCount > 0) {
    cards.push({
      id: 'bank_transfer_pending',
      severity: input.bankPendingCount >= 3 ? 'high' : 'medium',
      title: `${input.bankPendingCount} bank-transfer order${input.bankPendingCount === 1 ? '' : 's'} awaiting payment`,
      summary:
        'Confirm deposits manually — never auto Mark Paid. Cross-check bank statements before updating order status.',
      metric:
        input.bankPendingTotalAud > 0
          ? `$${input.bankPendingTotalAud.toFixed(2)} outstanding`
          : undefined,
      href: '/admin/orders?payment=bank&status=pending',
      actionLabel: 'Open orders',
      domain: 'orders',
    })
  }

  const recentPv = input.trafficRecent7.pageviews
  const priorPv = input.trafficPrior7.pageviews
  const recentConv =
    input.trafficRecent7.uniqueVisitors > 0
      ? (input.trafficRecent7.orders / input.trafficRecent7.uniqueVisitors) * 100
      : 0
  const priorConv =
    input.trafficPrior7.uniqueVisitors > 0
      ? (input.trafficPrior7.orders / input.trafficPrior7.uniqueVisitors) * 100
      : 0

  if (
    priorPv >= 10 &&
    recentPv >= priorPv * 1.15 &&
    recentConv <= priorConv + 0.25
  ) {
    cards.push({
      id: 'traffic_up_conversion_flat',
      severity: 'medium',
      title: 'Traffic rose but conversion did not keep up',
      summary:
        'Store visits increased vs the prior week while order conversion stayed flat. Consider a CMS promo or sticker PDP refresh — draft only, human approves.',
      metric: `${recentPv} pageviews (7d) · ${recentConv.toFixed(1)}% conv vs ${priorConv.toFixed(1)}% prior`,
      href: '/admin/traffic',
      actionLabel: 'Open traffic dashboard',
      domain: 'traffic',
    })
  }

  if (
    input.revenuePriorWeekAud >= 50 &&
    input.revenueThisWeekAud < input.revenuePriorWeekAud * 0.85
  ) {
    const dropPct =
      ((input.revenuePriorWeekAud - input.revenueThisWeekAud) / input.revenuePriorWeekAud) * 100
    cards.push({
      id: 'revenue_week_down',
      severity: dropPct >= 25 ? 'high' : 'medium',
      title: 'Weekly revenue is down vs last week',
      summary:
        'Check Sales Overview for category or SKU mix. Suggestions only — do not auto-change prices or mark orders paid.',
      metric: `$${input.revenueThisWeekAud.toFixed(0)} this week vs $${input.revenuePriorWeekAud.toFixed(0)} prior`,
      href: '/admin/sales-overview',
      actionLabel: 'Open sales overview',
      domain: 'sales',
    })
  }

  const severityRank: Record<PerformanceOpportunitySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }
  return cards.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

export async function loadPerformanceCoachInputs(): Promise<PerformanceCoachInputs> {
  const empty: PerformanceCoachInputs = {
    stalePendingApps: [],
    bankPendingCount: 0,
    bankPendingTotalAud: 0,
    trafficRecent7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
    trafficPrior7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
    revenueThisWeekAud: 0,
    revenuePriorWeekAud: 0,
  }

  if (!isSupabaseConfigured()) return empty

  const admin = getSupabaseAdmin()
  const today = toSydneyDay(new Date())
  const todayNoon = new Date(`${today}T12:00:00.000Z`)
  const fromNoon = new Date(todayNoon.getTime() - 13 * MS_DAY)
  const fromDay = toSydneyDay(fromNoon) || today
  const days14 = listSydneyDaysInclusive(fromDay, today)
  const recent7Days = days14.slice(-7)
  const prior7Days = days14.slice(0, 7)

  const stalePendingApps: PerformanceCoachInputs['stalePendingApps'] = []
  let bankPendingCount = 0
  let bankPendingTotalAud = 0
  const ordersByDay = new Map<string, number>()
  let revenueThisWeekAud = 0
  let revenuePriorWeekAud = 0

  try {
    const { data: partnerRows } = await admin
      .from('fundraising_partners')
      .select('payload,created_at')
      .order('created_at', { ascending: true })
      .limit(400)

    const cutoff = Date.now() - STALE_PENDING_DAYS * MS_DAY
    for (const row of partnerRows || []) {
      const payload = row.payload as { status?: string; organizationName?: string } | null
      if (payload?.status !== 'pending') continue
      const createdAt = row.created_at ? new Date(String(row.created_at)).getTime() : NaN
      if (!Number.isFinite(createdAt) || createdAt > cutoff) continue
      const daysPending = Math.floor((Date.now() - createdAt) / MS_DAY)
      stalePendingApps.push({
        organizationName: String(payload.organizationName || 'Partner application'),
        daysPending,
      })
    }
    stalePendingApps.sort((a, b) => b.daysPending - a.daysPending)
  } catch {
    /* non-fatal */
  }

  try {
    const { data: orderRows } = await admin
      .from('orders')
      .select('payload,created_at,platform_source,external_order_key')
      .order('created_at', { ascending: false })
      .limit(500)

    for (const row of orderRows || []) {
      const order = hydrateLedgerOrder(row as Parameters<typeof hydrateLedgerOrder>[0])
      if (order.paymentMethod === 'bank' && order.status === 'pending') {
        bankPendingCount += 1
        bankPendingTotalAud += orderRevenue(order)
      }
      const day = orderSydneyDay(order)
      if (day && days14.includes(day) && order.status !== 'cancelled') {
        ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1)
      }
      if (day && recent7Days.includes(day)) {
        revenueThisWeekAud += orderRevenue(order)
      } else if (day && prior7Days.includes(day)) {
        revenuePriorWeekAud += orderRevenue(order)
      }
    }
  } catch {
    /* non-fatal */
  }

  const trafficRecent7 = { pageviews: 0, uniqueVisitors: 0, orders: 0 }
  const trafficPrior7 = { pageviews: 0, uniqueVisitors: 0, orders: 0 }
  const visitorsRecentAll = new Set<string>()
  const visitorsPriorAll = new Set<string>()

  try {
    const { data: pvRows } = await admin
      .from('site_pageviews')
      .select('day,visitor_id')
      .gte('day', fromDay)
      .lte('day', today)
      .limit(50_000)

    for (const row of pvRows || []) {
      const day = typeof row.day === 'string' ? row.day.slice(0, 10) : ''
      if (!day) continue
      if (recent7Days.includes(day)) {
        trafficRecent7.pageviews += 1
        const vid = typeof row.visitor_id === 'string' ? row.visitor_id : ''
        if (vid) visitorsRecentAll.add(vid)
      } else if (prior7Days.includes(day)) {
        trafficPrior7.pageviews += 1
        const vid = typeof row.visitor_id === 'string' ? row.visitor_id : ''
        if (vid) visitorsPriorAll.add(vid)
      }
    }

    trafficRecent7.uniqueVisitors = visitorsRecentAll.size
    trafficPrior7.uniqueVisitors = visitorsPriorAll.size
    trafficRecent7.orders = sumDailyMetric(ordersByDay, recent7Days)
    trafficPrior7.orders = sumDailyMetric(ordersByDay, prior7Days)
  } catch {
    /* non-fatal — table may be missing in dev */
  }

  return {
    stalePendingApps,
    bankPendingCount,
    bankPendingTotalAud,
    trafficRecent7,
    trafficPrior7,
    revenueThisWeekAud,
    revenuePriorWeekAud,
  }
}

export async function loadPerformanceOpportunities(): Promise<PerformanceOpportunity[]> {
  const inputs = await loadPerformanceCoachInputs()
  return buildPerformanceOpportunities(inputs)
}
