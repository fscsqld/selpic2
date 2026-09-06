/**
 * Pure Performance coach card builder (no server I/O).
 * Loaders live in performanceCoach.ts.
 */

export type PerformanceOpportunitySeverity = 'high' | 'medium' | 'low'

export type PerformanceOpportunityKind = 'ops' | 'site_upgrade'

export type PerformanceOpportunityId =
  | 'fundraising_stale_pending'
  | 'bank_transfer_pending'
  | 'traffic_up_conversion_flat'
  | 'revenue_week_down'
  | 'thin_product_copy'
  | 'inbound_queue_backlog'
  | 'community_drafts_pending'
  | 'fundraising_open_replies'

export type PerformanceOpportunityDomain =
  | 'fundraising'
  | 'sales'
  | 'traffic'
  | 'orders'
  | 'products'
  | 'inbound'
  | 'community'

export type PerformanceOpportunity = {
  id: PerformanceOpportunityId
  severity: PerformanceOpportunitySeverity
  kind: PerformanceOpportunityKind
  title: string
  summary: string
  metric?: string
  href: string
  actionLabel: string
  domain: PerformanceOpportunityDomain
}

export type PerformanceCoachInputs = {
  stalePendingApps: Array<{ organizationName: string; daysPending: number }>
  bankPendingCount: number
  bankPendingTotalAud: number
  trafficRecent7: { pageviews: number; uniqueVisitors: number; orders: number }
  trafficPrior7: { pageviews: number; uniqueVisitors: number; orders: number }
  revenueThisWeekAud: number
  revenuePriorWeekAud: number
  thinProductCopy: { count: number; sampleName?: string }
  newInboundMessages: number
  newBespokeRequests: number
  communityPendingDrafts: number
  fundraisingOpenReplies: number
}

const STALE_PENDING_DAYS = 7
/** Card/listing blurb — SELPIC often keeps this intentionally short. */
const SHORT_DESC_MIN = 40
/** Minimum usable PDP body in either description or detailDescription. */
const DETAIL_DESC_MIN = 160

type ThinCopyProductLike = {
  name?: string
  description?: string
  detailDescription?: string
  hasDetailPage?: boolean
  inStock?: boolean
}

/**
 * True when storefront copy looks too thin for a live listing (OOS skipped).
 * Cousin learned 2026-09: many SKUs keep `description` ~30 chars for cards while
 * `detailDescription` holds the full PDP — flagging short listing alone was a false positive.
 */
export function isThinProductCopy(p: ThinCopyProductLike): boolean {
  if (p.inStock === false) return false
  const short = (p.description || '').trim()
  const detail = (p.detailDescription || '').trim()
  const best = Math.max(short.length, detail.length)

  if (p.hasDetailPage === true) {
    return best < DETAIL_DESC_MIN
  }
  // Listing-only SKUs: need a usable short blurb (detail optional).
  return short.length < SHORT_DESC_MIN && detail.length < DETAIL_DESC_MIN
}

export function summarizeThinProductCopy(
  products: ThinCopyProductLike[]
): PerformanceCoachInputs['thinProductCopy'] {
  const thin = products.filter(isThinProductCopy)
  return {
    count: thin.length,
    sampleName: thin[0]?.name?.trim() || undefined,
  }
}

export function emptyPerformanceCoachInputs(): PerformanceCoachInputs {
  return {
    stalePendingApps: [],
    bankPendingCount: 0,
    bankPendingTotalAud: 0,
    trafficRecent7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
    trafficPrior7: { pageviews: 0, uniqueVisitors: 0, orders: 0 },
    revenueThisWeekAud: 0,
    revenuePriorWeekAud: 0,
    thinProductCopy: { count: 0 },
    newInboundMessages: 0,
    newBespokeRequests: 0,
    communityPendingDrafts: 0,
    fundraisingOpenReplies: 0,
  }
}

/** Pure builder — ranked opportunity cards. No auto actions. */
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
      kind: 'ops',
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
      kind: 'ops',
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
      kind: 'ops',
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
      kind: 'ops',
      title: 'Weekly revenue is down vs last week',
      summary:
        'Check Sales Overview for category or SKU mix. Suggestions only — do not auto-change prices or mark orders paid.',
      metric: `$${input.revenueThisWeekAud.toFixed(0)} this week vs $${input.revenuePriorWeekAud.toFixed(0)} prior`,
      href: '/admin/sales-overview',
      actionLabel: 'Open sales overview',
      domain: 'sales',
    })
  }

  if (input.thinProductCopy.count > 0) {
    const n = input.thinProductCopy.count
    const sample = input.thinProductCopy.sampleName
    cards.push({
      id: 'thin_product_copy',
      severity: n >= 8 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${n} product${n === 1 ? '' : 's'} need stronger storefront copy`,
      summary: sample
        ? `Includes “${sample}”. Use Generate template / Polish on product forms — human Apply → Save. No auto-publish.`
        : 'Use Generate template / Polish on product forms — human Apply → Save. No auto-publish.',
      metric: 'Short listing or PDP detail below length thresholds',
      href: '/admin/products',
      actionLabel: 'Open products',
      domain: 'products',
    })
  }

  const inboundTotal = input.newInboundMessages + input.newBespokeRequests
  if (inboundTotal > 0) {
    cards.push({
      id: 'inbound_queue_backlog',
      severity: inboundTotal >= 5 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${inboundTotal} customer care item${inboundTotal === 1 ? '' : 's'} waiting for a draft`,
      summary:
        'Open Inbound to draft → edit → Send. Template or Polish stays HITL — never auto-reply.',
      metric: `${input.newInboundMessages} message${input.newInboundMessages === 1 ? '' : 's'} · ${input.newBespokeRequests} bespoke`,
      href: '/admin/agent/inbound',
      actionLabel: 'Open inbound workspace',
      domain: 'inbound',
    })
  }

  if (input.communityPendingDrafts > 0) {
    const n = input.communityPendingDrafts
    cards.push({
      id: 'community_drafts_pending',
      severity: n >= 5 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${n} community draft${n === 1 ? '' : 's'} pending review`,
      summary:
        'Approve or edit in Community agent, then publish with community:write. Never auto-edit homepage Hero.',
      metric: 'Queue drafts only — nothing auto-publishes',
      href: '/admin/agent/community',
      actionLabel: 'Open community queue',
      domain: 'community',
    })
  }

  if (input.fundraisingOpenReplies > 0) {
    const n = input.fundraisingOpenReplies
    cards.push({
      id: 'fundraising_open_replies',
      severity: n >= 5 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${n} fundraising ${n === 1 ? 'reply needs' : 'replies need'} a follow-up`,
      summary:
        'Use Needs reply on the Fundraising Agent — draft → human Send. Not CS inbound.',
      metric: 'Open outreach replies',
      href: '/admin/fundraising/agent',
      actionLabel: 'Open fundraising agent',
      domain: 'fundraising',
    })
  }

  const severityRank: Record<PerformanceOpportunitySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }
  return cards.sort((a, b) => {
    const bySev = severityRank[a.severity] - severityRank[b.severity]
    if (bySev !== 0) return bySev
    if (a.kind !== b.kind) return a.kind === 'ops' ? -1 : 1
    return 0
  })
}
