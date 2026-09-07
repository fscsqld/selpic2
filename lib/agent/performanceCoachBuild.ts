/**
 * Pure Performance coach card builder (no server I/O).
 * Loaders live in performanceCoach.ts.
 *
 * Cousins: empty catalogs, OOS SKUs, short card + rich PDP (not thin),
 * community queue file-only on serverless (items empty on prod until enqueued),
 * never invent prices in nextSteps, no auto Mark Paid / auto-publish.
 */

export type PerformanceOpportunitySeverity = 'high' | 'medium' | 'low'

export type PerformanceOpportunityKind = 'ops' | 'site_upgrade'

export type PerformanceOpportunityId =
  | 'fundraising_stale_pending'
  | 'bank_transfer_pending'
  | 'traffic_up_conversion_flat'
  | 'revenue_week_down'
  | 'thin_product_copy'
  | 'weak_product_imagery'
  | 'inbound_queue_backlog'
  | 'community_drafts_pending'
  | 'fundraising_open_replies'
  | 'newsletter_idle'

export type PerformanceOpportunityDomain =
  | 'fundraising'
  | 'sales'
  | 'traffic'
  | 'orders'
  | 'products'
  | 'inbound'
  | 'community'
  | 'newsletter'

/** Sample row for the card checklist — optional deep-link (HITL only). */
export type PerformanceOpportunityItem = {
  label: string
  detail?: string
  href?: string
}

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
  /** Ordered HITL steps — human still decides every consequential action. */
  nextSteps?: string[]
  /** Up to a few concrete items (product names, draft titles, orgs). */
  items?: PerformanceOpportunityItem[]
}

export type PerformanceCoachInputs = {
  stalePendingApps: Array<{ organizationName: string; daysPending: number }>
  bankPendingCount: number
  bankPendingTotalAud: number
  trafficRecent7: { pageviews: number; uniqueVisitors: number; orders: number }
  trafficPrior7: { pageviews: number; uniqueVisitors: number; orders: number }
  revenueThisWeekAud: number
  revenuePriorWeekAud: number
  thinProductCopy: {
    count: number
    sampleName?: string
    sampleNames?: string[]
    samples?: Array<{ id?: string; name: string }>
  }
  weakProductImagery: {
    count: number
    sampleName?: string
    sampleNames?: string[]
    samples?: Array<{ id?: string; name: string; reason?: string }>
  }
  newInboundMessages: number
  newBespokeRequests: number
  /** Concrete inbound rows (subject/from + deep-link). */
  inboundSamples?: PerformanceOpportunityItem[]
  communityPendingDrafts: number
  communityDraftTitles?: string[]
  communityDraftItems?: Array<{ id: string; title: string }>
  fundraisingOpenReplies: number
  fundraisingOpenReplySamples?: string[]
  fundraisingOpenReplyItems?: Array<{ subject?: string; fromEmail?: string }>
  /**
   * Days since last newsletter campaign send.
   * - number: known last send
   * - null: query ok, never sent
   * - undefined: unknown (do not surface newsletter_idle)
   */
  newsletterDaysSinceLastCampaign?: number | null
  newsletterActiveSubscribers?: number
}

const STALE_PENDING_DAYS = 7
const SHORT_DESC_MIN = 40
const DETAIL_DESC_MIN = 160
const MAX_ITEMS = 5
/** Soft nudge when no subscriber campaign has been sent recently. */
const NEWSLETTER_IDLE_DAYS = 14

type ThinCopyProductLike = {
  id?: string
  name?: string
  description?: string
  detailDescription?: string
  hasDetailPage?: boolean
  inStock?: boolean
}

/**
 * True when storefront copy looks too thin for a live listing (OOS skipped).
 * Cousin: short card blurb + rich detailDescription is NOT thin.
 */
export function isThinProductCopy(p: ThinCopyProductLike): boolean {
  if (p.inStock === false) return false
  const short = (p.description || '').trim()
  const detail = (p.detailDescription || '').trim()
  const best = Math.max(short.length, detail.length)

  if (p.hasDetailPage === true) {
    return best < DETAIL_DESC_MIN
  }
  return short.length < SHORT_DESC_MIN && detail.length < DETAIL_DESC_MIN
}

export function summarizeThinProductCopy(
  products: ThinCopyProductLike[]
): PerformanceCoachInputs['thinProductCopy'] {
  const thin = products.filter(isThinProductCopy)
  const samples = thin
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id.trim() : undefined,
      name: (p.name || '').trim(),
    }))
    .filter((p) => p.name)
    .slice(0, MAX_ITEMS)
  const sampleNames = samples.map((s) => s.name)
  return {
    count: thin.length,
    sampleName: sampleNames[0],
    sampleNames,
    samples,
  }
}

function itemListFromLabels(labels: string[] | undefined): PerformanceOpportunityItem[] | undefined {
  const cleaned = (labels || []).map((l) => l.trim()).filter(Boolean).slice(0, MAX_ITEMS)
  if (!cleaned.length) return undefined
  return cleaned.map((label) => ({ label }))
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
    weakProductImagery: { count: 0 },
    newInboundMessages: 0,
    newBespokeRequests: 0,
    inboundSamples: [],
    communityPendingDrafts: 0,
    communityDraftTitles: [],
    communityDraftItems: [],
    fundraisingOpenReplies: 0,
    fundraisingOpenReplySamples: [],
    fundraisingOpenReplyItems: [],
    newsletterDaysSinceLastCampaign: undefined,
    newsletterActiveSubscribers: 0,
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
    const items = input.stalePendingApps.slice(0, MAX_ITEMS).map((a) => ({
      label: a.organizationName,
      detail: `${a.daysPending} days pending`,
    }))
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
      items,
      nextSteps: [
        'Open pending partners and review the oldest applications first.',
        'Approve, request missing info, or decline — do not leave them idle.',
        'After a decision, confirm the partner sees the correct status in Fundraising admin.',
      ],
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
      nextSteps: [
        'Open bank-transfer orders filtered to pending payment.',
        'Match each order against your bank statement (amount + reference).',
        'Only then Mark Paid manually — never auto-approve from this card.',
      ],
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
      nextSteps: [
        'Open Traffic and confirm which landing paths rose (stickers, hot-goods, home).',
        'Spot-check 1–2 PDPs for clear copy and images — use Product Generate/Polish if thin (Apply → Save).',
        'Optional: draft a CMS or Newsletter promo — human Approve/Send only. Do not auto-change prices.',
      ],
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
      nextSteps: [
        'Open Sales Overview and compare this week vs last by category/SKU.',
        'Check for cancelled orders or unusual refunds before changing merchandising.',
        'Any price or promo change stays human-approved in Products / Promo codes — not from this card.',
      ],
    })
  }

  if (input.thinProductCopy.count > 0) {
    const n = input.thinProductCopy.count
    const sample = input.thinProductCopy.sampleName
    const productItems: PerformanceOpportunityItem[] =
      (input.thinProductCopy.samples || [])
        .slice(0, MAX_ITEMS)
        .map((s) => ({
          label: s.name,
          detail: s.id ? `id ${s.id}` : undefined,
          href: s.id
            ? `/admin/products?q=${encodeURIComponent(s.id)}`
            : `/admin/products?q=${encodeURIComponent(s.name)}`,
        }))
    const fallbackNames =
      input.thinProductCopy.sampleNames?.length
        ? input.thinProductCopy.sampleNames
        : sample
          ? [sample]
          : []
    cards.push({
      id: 'thin_product_copy',
      severity: n >= 8 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${n} product${n === 1 ? '' : 's'} need stronger storefront copy`,
      summary: sample
        ? `Includes “${sample}”. Use Generate template / Polish on product forms — human Apply → Save. No auto-publish.`
        : 'Use Generate template / Polish on product forms — human Apply → Save. No auto-publish.',
      metric: 'Best of listing/PDP body below length thresholds',
      href: '/admin/products',
      actionLabel: 'Open products',
      domain: 'products',
      items: productItems.length ? productItems : itemListFromLabels(fallbackNames),
      nextSteps: [
        'Open a product via the item link (filters Products by id/name).',
        'Generate template or Polish with AI for short and/or detail description.',
        'Apply → review → Save. Do not invent prices, stock, or ship dates in published copy.',
      ],
    })
  }

  if (input.weakProductImagery.count > 0) {
    const n = input.weakProductImagery.count
    const sample = input.weakProductImagery.sampleName
    const imageryItems: PerformanceOpportunityItem[] =
      (input.weakProductImagery.samples || [])
        .slice(0, MAX_ITEMS)
        .map((s) => ({
          label: s.name,
          detail: s.reason || (s.id ? `id ${s.id}` : undefined),
          href: s.id
            ? `/admin/products?q=${encodeURIComponent(s.id)}&edit=${encodeURIComponent(s.id)}`
            : `/admin/products?q=${encodeURIComponent(s.name)}`,
        }))
    const fallbackNames =
      input.weakProductImagery.sampleNames?.length
        ? input.weakProductImagery.sampleNames
        : sample
          ? [sample]
          : []
    cards.push({
      id: 'weak_product_imagery',
      severity: n >= 8 ? 'high' : 'medium',
      kind: 'site_upgrade',
      title: `${n} product${n === 1 ? '' : 's'} need stronger primary imagery`,
      summary: sample
        ? `Includes “${sample}”. Use Products → Generate / Edit with AI → Apply → Save (HITL).`
        : 'Use Products → Generate / Edit with AI → Apply → Save (HITL).',
      metric: 'Missing, placeholder, or non-syncable primary image URL',
      href: '/admin/products',
      actionLabel: 'Open products',
      domain: 'products',
      items: imageryItems.length ? imageryItems : itemListFromLabels(fallbackNames),
      nextSteps: [
        'Open a product via the item link (filters + opens Edit when id matches).',
        'Upload a real https image (Media Library), or Generate / Edit with AI → Apply → Save.',
        'Avoid indexeddb:// / data: URLs — they will not sync to the storefront.',
      ],
    })
  }

  const inboundTotal = input.newInboundMessages + input.newBespokeRequests
  if (inboundTotal > 0) {
    const inboundItems: PerformanceOpportunityItem[] =
      input.inboundSamples && input.inboundSamples.length > 0
        ? input.inboundSamples.slice(0, MAX_ITEMS)
        : [
            ...(input.newInboundMessages > 0
              ? [
                  {
                    label: `${input.newInboundMessages} new contact message${input.newInboundMessages === 1 ? '' : 's'}`,
                    detail: 'Status = new',
                    href: '/admin/agent/inbound',
                  },
                ]
              : []),
            ...(input.newBespokeRequests > 0
              ? [
                  {
                    label: `${input.newBespokeRequests} new bespoke request${input.newBespokeRequests === 1 ? '' : 's'}`,
                    detail: 'Status = new',
                    href: '/admin/agent/inbound?channel=bespoke',
                  },
                ]
              : []),
          ]
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
      items: inboundItems,
      nextSteps: [
        'Open an item link (or Inbound workspace) for the oldest new message/bespoke.',
        'Generate template (optional Polish with AI), edit the draft, then Send with messages/bespoke write permission.',
        'Never auto-reply from Performance — each send stays human-approved.',
      ],
    })
  }

  if (input.communityPendingDrafts > 0) {
    const n = input.communityPendingDrafts
    const communityItems: PerformanceOpportunityItem[] =
      (input.communityDraftItems || [])
        .slice(0, MAX_ITEMS)
        .map((d) => ({
          label: d.title,
          href: `/admin/agent/community?draft=${encodeURIComponent(d.id)}`,
        }))
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
      items: communityItems.length
        ? communityItems
        : itemListFromLabels(input.communityDraftTitles),
      nextSteps: [
        'Open a draft link (or Community queue) and review the pending title.',
        'Edit or Polish if needed, then Approve & publish with community:write.',
        'Do not edit homepage Hero from this flow. Queue is shared via Supabase site_configs.',
      ],
    })
  }

  if (input.fundraisingOpenReplies > 0) {
    const n = input.fundraisingOpenReplies
    const replyItems: PerformanceOpportunityItem[] =
      (input.fundraisingOpenReplyItems || [])
        .slice(0, MAX_ITEMS)
        .map((r) => {
          const subject = (r.subject || '').trim()
          const from = (r.fromEmail || '').trim()
          return {
            label: subject || from || 'Open reply',
            detail: subject && from ? from : undefined,
            href: '/admin/fundraising/agent',
          }
        })
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
      items: replyItems.length
        ? replyItems
        : itemListFromLabels(input.fundraisingOpenReplySamples),
      nextSteps: [
        'Open Fundraising Agent → Needs reply (match subject / from below).',
        'Draft (template or Polish), edit, then Send with fundraising:write.',
        'Mark handled / OPTED_OUT as appropriate — never mix with newsletter subscriber lists.',
      ],
    })
  }

  const daysIdle = input.newsletterDaysSinceLastCampaign
  const activeSubs = input.newsletterActiveSubscribers ?? 0
  // Only when campaign history is known — never invent idle from a failed campaigns query.
  if (
    activeSubs > 0 &&
    daysIdle !== undefined &&
    (daysIdle === null || daysIdle >= NEWSLETTER_IDLE_DAYS)
  ) {
    cards.push({
      id: 'newsletter_idle',
      severity: daysIdle === null || daysIdle >= 30 ? 'medium' : 'low',
      kind: 'site_upgrade',
      title:
        daysIdle === null
          ? 'Newsletter subscribers have no recent campaign'
          : `No newsletter campaign in ${daysIdle} days`,
      summary:
        'Draft a subscriber campaign in Newsletter assist — Apply → Newsletter admin → human Send. Never mix with fundraising outreach_targets.',
      metric: `${activeSubs} active subscriber${activeSubs === 1 ? '' : 's'}`,
      href: '/admin/agent/newsletter',
      actionLabel: 'Open Newsletter assist',
      domain: 'newsletter',
      items: [
        {
          label: 'Generate template / Polish',
          detail: 'HITL draft only',
          href: '/admin/agent/newsletter',
        },
        {
          label: 'Newsletter admin (Send)',
          detail: 'Choose recipients',
          href: '/admin/newsletter',
        },
      ],
      nextSteps: [
        'Open Newsletter assist and Generate template (optional Polish).',
        'Apply to Newsletter admin, review subject/body, choose subscribers.',
        'Send only with newsletter:write — never auto-send from Performance.',
      ],
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
