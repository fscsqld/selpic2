/**
 * Wave 4 Performance coach — loaders + re-exports.
 * Pure card rules live in performanceCoachBuild.ts (testable without @/ server graph).
 * Site-upgrade cards deep-link existing tools; no separate CRO sector.
 */

import { listSydneyDaysInclusive, toSydneyDay } from '@/lib/analytics/sydney-day'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { hydrateLedgerOrder } from '@/lib/orders/ledgerOrderHydrate'
import type { OrderRecord } from '@/lib/store'
import { readCatalogProducts } from '@/lib/server/catalogStore'
import { listPendingCommunityDrafts } from '@/lib/server/communityDraftQueueStore'
import {
  countBespokeStickerRequestsByStatus,
  readBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'
import { summarizeOpenOutreachReplies } from '@/lib/fundraising/outreachReplyPersistence'
import {
  buildPerformanceOpportunities,
  emptyPerformanceCoachInputs,
  summarizeThinProductCopy,
  type PerformanceCoachInputs,
  type PerformanceOpportunity,
} from './performanceCoachBuild'

export type {
  PerformanceCoachInputs,
  PerformanceOpportunity,
  PerformanceOpportunityDomain,
  PerformanceOpportunityId,
  PerformanceOpportunityKind,
  PerformanceOpportunitySeverity,
} from './performanceCoachBuild'

export {
  buildPerformanceOpportunities,
  emptyPerformanceCoachInputs,
  isThinProductCopy,
  summarizeThinProductCopy,
} from './performanceCoachBuild'

const MS_DAY = 24 * 60 * 60 * 1000
const STALE_PENDING_DAYS = 7

function sumDailyMetric(daily: Map<string, number>, days: string[]): number {
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

export async function loadPerformanceCoachInputs(): Promise<PerformanceCoachInputs> {
  const inputs = emptyPerformanceCoachInputs()

  try {
    const products = await readCatalogProducts()
    inputs.thinProductCopy = summarizeThinProductCopy(products)
  } catch {
    /* non-fatal */
  }

  try {
    const pending = await listPendingCommunityDrafts()
    inputs.communityPendingDrafts = pending.length
  } catch {
    /* non-fatal */
  }

  try {
    const bespoke = await readBespokeStickerRequests()
    inputs.newBespokeRequests = countBespokeStickerRequestsByStatus(bespoke, 'new')
  } catch {
    /* non-fatal */
  }

  try {
    inputs.fundraisingOpenReplies = (await summarizeOpenOutreachReplies()).count
  } catch {
    /* non-fatal */
  }

  if (!isSupabaseConfigured()) {
    return inputs
  }

  const admin = getSupabaseAdmin()
  const today = toSydneyDay(new Date())
  const todayNoon = new Date(`${today}T12:00:00.000Z`)
  const fromNoon = new Date(todayNoon.getTime() - 13 * MS_DAY)
  const fromDay = toSydneyDay(fromNoon) || today
  const days14 = listSydneyDaysInclusive(fromDay, today)
  const recent7Days = days14.slice(-7)
  const prior7Days = days14.slice(0, 7)

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
      inputs.stalePendingApps.push({
        organizationName: String(payload.organizationName || 'Partner application'),
        daysPending,
      })
    }
    inputs.stalePendingApps.sort((a, b) => b.daysPending - a.daysPending)
  } catch {
    /* non-fatal */
  }

  const ordersByDay = new Map<string, number>()

  try {
    const { data: orderRows } = await admin
      .from('orders')
      .select('payload,created_at,platform_source,external_order_key')
      .order('created_at', { ascending: false })
      .limit(500)

    for (const row of orderRows || []) {
      const order = hydrateLedgerOrder(row as Parameters<typeof hydrateLedgerOrder>[0])
      if (order.paymentMethod === 'bank' && order.status === 'pending') {
        inputs.bankPendingCount += 1
        inputs.bankPendingTotalAud += orderRevenue(order)
      }
      const day = orderSydneyDay(order)
      if (day && days14.includes(day) && order.status !== 'cancelled') {
        ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1)
      }
      if (day && recent7Days.includes(day)) {
        inputs.revenueThisWeekAud += orderRevenue(order)
      } else if (day && prior7Days.includes(day)) {
        inputs.revenuePriorWeekAud += orderRevenue(order)
      }
    }
  } catch {
    /* non-fatal */
  }

  try {
    const { count, error } = await admin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
    if (!error) inputs.newInboundMessages = count ?? 0
  } catch {
    /* non-fatal */
  }

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
        inputs.trafficRecent7.pageviews += 1
        const vid = typeof row.visitor_id === 'string' ? row.visitor_id : ''
        if (vid) visitorsRecentAll.add(vid)
      } else if (prior7Days.includes(day)) {
        inputs.trafficPrior7.pageviews += 1
        const vid = typeof row.visitor_id === 'string' ? row.visitor_id : ''
        if (vid) visitorsPriorAll.add(vid)
      }
    }

    inputs.trafficRecent7.uniqueVisitors = visitorsRecentAll.size
    inputs.trafficPrior7.uniqueVisitors = visitorsPriorAll.size
    inputs.trafficRecent7.orders = sumDailyMetric(ordersByDay, recent7Days)
    inputs.trafficPrior7.orders = sumDailyMetric(ordersByDay, prior7Days)
  } catch {
    /* non-fatal */
  }

  return inputs
}

export async function loadPerformanceOpportunities(): Promise<PerformanceOpportunity[]> {
  const inputs = await loadPerformanceCoachInputs()
  return buildPerformanceOpportunities(inputs)
}
