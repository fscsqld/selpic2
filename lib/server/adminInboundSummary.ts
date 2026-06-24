import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  countBespokeStickerRequestsByStatus,
  readBespokeStickerRequests,
} from '@/lib/server/bespokeStickerRequests'
import type { OrderRecord } from '@/lib/store'

export type InboundSummaryKey =
  | 'contact'
  | 'bespoke'
  | 'newsletter'
  | 'community'
  | 'orders'

export type InboundSummaryItem = {
  key: InboundSummaryKey
  label: string
  count: number
  href: string
  latestTitle?: string
  latestSubtitle?: string
}

export type AdminInboundSummary = {
  totalCount: number
  items: InboundSummaryItem[]
}

const RECENT_NEWSLETTER_DAYS = 7
const RECENT_COMMUNITY_HOURS = 48

function orderNeedsAttention(status: string | undefined): boolean {
  return status === 'pending' || status === 'paid'
}

export async function fetchAdminInboundSummary(): Promise<AdminInboundSummary> {
  const items: InboundSummaryItem[] = []

  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin()
      const { count, error } = await admin
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')

      if (!error) {
        const { data: latest } = await admin
          .from('contact_messages')
          .select('name,subject,created_at')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        items.push({
          key: 'contact',
          label: 'Customer Messages',
          count: count ?? 0,
          href: '/admin/messages',
          latestTitle: latest?.subject ? String(latest.subject) : undefined,
          latestSubtitle: latest?.name ? `From ${latest.name}` : undefined,
        })
      }
    } catch {
      /* non-fatal */
    }
  }

  try {
    const bespoke = await readBespokeStickerRequests()
    const newCount = countBespokeStickerRequestsByStatus(bespoke, 'new')
    const latest = bespoke.find((r) => r.status === 'new')
    const contact = (latest?.payload?.contact || {}) as { name?: string; email?: string }
    items.push({
      key: 'bespoke',
      label: 'Bespoke Label Requests',
      count: newCount,
      href: '/admin/bespoke-requests',
      latestTitle: contact.name || latest?.id,
      latestSubtitle: contact.email,
    })
  } catch {
    /* non-fatal */
  }

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin()
    const now = Date.now()

    try {
      const since = new Date(now - RECENT_NEWSLETTER_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { count, error } = await admin
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('subscribed_at', since)

      if (!error) {
        const { data: latest } = await admin
          .from('newsletter_subscribers')
          .select('email,subscribed_at')
          .eq('is_active', true)
          .gte('subscribed_at', since)
          .order('subscribed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        items.push({
          key: 'newsletter',
          label: 'Newsletter (new, 7 days)',
          count: count ?? 0,
          href: '/admin/newsletter',
          latestTitle: latest?.email ? String(latest.email) : undefined,
        })
      }
    } catch {
      /* non-fatal */
    }

    try {
      const sinceCommunity = new Date(now - RECENT_COMMUNITY_HOURS * 60 * 60 * 1000).toISOString()
      const { data: reported } = await admin
        .from('community_posts')
        .select('id,title,author_display,created_at')
        .eq('reported', true)
        .eq('hidden', false)

      const { data: recent } = await admin
        .from('community_posts')
        .select('id,title,author_display,created_at')
        .eq('hidden', false)
        .gte('created_at', sinceCommunity)
        .order('created_at', { ascending: false })
        .limit(50)

      const reportedIds = new Set((reported || []).map((p) => p.id))
      const recentOnly = (recent || []).filter((p) => !reportedIds.has(p.id))
      const communityCount = (reported?.length || 0) + recentOnly.length
      const latest = (reported || [])[0] || recentOnly[0] || null

      items.push({
        key: 'community',
        label: 'Community Board',
        count: communityCount,
        href: '/admin/community',
        latestTitle: latest?.title ? String(latest.title) : undefined,
        latestSubtitle: latest?.author_display ? `By ${latest.author_display}` : undefined,
      })
    } catch {
      /* non-fatal */
    }

    try {
      const { data: orderRows, error } = await admin
        .from('orders')
        .select('id,payload,created_at')
        .order('created_at', { ascending: false })
        .limit(400)

      if (!error && orderRows) {
        const attention = orderRows.filter((row) => {
          const payload = row.payload as OrderRecord | null
          return payload && orderNeedsAttention(payload.status)
        })
        const latest = attention[0]
        const latestPayload = latest?.payload as OrderRecord | undefined
        items.push({
          key: 'orders',
          label: 'Orders (pending / paid)',
          count: attention.length,
          href: '/admin/orders',
          latestTitle: latest?.id ? String(latest.id) : undefined,
          latestSubtitle: latestPayload?.customer?.name,
        })
      }
    } catch {
      /* non-fatal */
    }
  }

  const totalCount = items.reduce((sum, item) => sum + item.count, 0)
  return { totalCount, items }
}
