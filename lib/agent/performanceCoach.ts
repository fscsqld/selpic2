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
import { listOutreachReplies, summarizeOpenOutreachReplies } from '@/lib/fundraising/outreachReplyPersistence'
import { buildAgentInboundDraftHref } from '@/lib/agent/inboundLinks'
import {
  buildPerformanceOpportunities,
  emptyPerformanceCoachInputs,
  summarizeThinProductCopy,
  type PerformanceCoachInputs,
  type PerformanceOpportunity,
  type PerformanceOpportunityItem,
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
    inputs.communityDraftItems = pending.slice(0, 5).map((d) => ({
      id: d.id,
      title: (d.title || '').trim() || d.id,
    }))
    inputs.communityDraftTitles = inputs.communityDraftItems.map((d) => d.title)
  } catch {
    /* non-fatal */
  }

  try {
    const bespoke = await readBespokeStickerRequests()
    const newBespoke = bespoke.filter((r) => r.status === 'new')
    inputs.newBespokeRequests =
      countBespokeStickerRequestsByStatus(bespoke, 'new') || newBespoke.length
    const bespokeSamples: PerformanceOpportunityItem[] = newBespoke.slice(0, 5).map((r) => {
      const payload = r.payload || {}
      const name = String(
        (payload as { name?: string; customerName?: string }).name ||
          (payload as { customerName?: string }).customerName ||
          ''
      ).trim()
      const email = String(
        (payload as { email?: string; customerEmail?: string }).email ||
          (payload as { customerEmail?: string }).customerEmail ||
          ''
      ).trim()
      return {
        label: name || email || `Bespoke ${r.id.slice(0, 8)}`,
        detail: email && name ? email : 'bespoke · new',
        href: buildAgentInboundDraftHref('bespoke', r.id),
      }
    })
    if (bespokeSamples.length) {
      inputs.inboundSamples = [...(inputs.inboundSamples || []), ...bespokeSamples]
    }
  } catch {
    /* non-fatal */
  }

  try {
    const summary = await summarizeOpenOutreachReplies()
    inputs.fundraisingOpenReplies = summary.count
    const openRows = await listOutreachReplies({ status: 'open', limit: 5 })
    inputs.fundraisingOpenReplyItems = openRows.map((r) => ({
      subject: (r.subject || '').trim() || undefined,
      fromEmail: (r.fromEmail || '').trim() || undefined,
    }))
    inputs.fundraisingOpenReplySamples = openRows
      .map((r) => (r.subject || '').trim() || (r.fromEmail || '').trim())
      .filter(Boolean)
      .slice(0, 5)
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
    const { data: msgRows, error, count } = await admin
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error) {
      inputs.newInboundMessages = count ?? msgRows?.length ?? 0
      const messageSamples: PerformanceOpportunityItem[] = (msgRows || []).map((row) => {
        const r = row as Record<string, unknown>
        const id = String(r.id || '')
        const subject = String(r.subject || r.title || '').trim()
        const name = String(r.name || r.customer_name || r.full_name || '').trim()
        const email = String(r.email || r.customer_email || '').trim()
        return {
          label: subject || name || email || `Message ${id.slice(0, 8)}`,
          detail: [name, email].filter(Boolean).join(' · ') || 'contact · new',
          href: id ? buildAgentInboundDraftHref('message', id) : '/admin/agent/inbound',
        }
      })
      inputs.inboundSamples = [...messageSamples, ...(inputs.inboundSamples || [])].slice(0, 5)
    }
  } catch {
    /* non-fatal */
  }

  try {
    const { count: subCount, error: subErr } = await admin
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (!subErr) inputs.newsletterActiveSubscribers = subCount ?? 0

    const { data: campRows, error: campErr } = await admin
      .from('newsletter_campaigns')
      .select('sent_at')
      .order('sent_at', { ascending: false })
      .limit(1)
    if (!campErr) {
      const sentAt = campRows?.[0]?.sent_at
      if (sentAt) {
        const t = new Date(String(sentAt)).getTime()
        if (Number.isFinite(t)) {
          inputs.newsletterDaysSinceLastCampaign = Math.floor((Date.now() - t) / MS_DAY)
        } else {
          inputs.newsletterDaysSinceLastCampaign = null
        }
      } else {
        inputs.newsletterDaysSinceLastCampaign = null
      }
    }
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
