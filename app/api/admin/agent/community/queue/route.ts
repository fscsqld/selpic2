import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  applyWeekEnqueuePlan,
  buildQueuedDraftFromTopic,
  planWeekSuggestionEnqueue,
} from '@/lib/agent/communityDraftQueue'
import { describeAuEditorialWindow } from '@/lib/agent/auCommunityCalendar'
import {
  listPendingCommunityDrafts,
  readCommunityDraftQueue,
  replaceCommunityDraftQueue,
  upsertQueuedCommunityDraft,
} from '@/lib/server/communityDraftQueueStore'

export const dynamic = 'force-dynamic'

type PostBody = {
  action?: 'enqueue' | 'generate_week'
  topicId?: string
  sourceNotes?: string
  customBrief?: string
  forceMarketS?: boolean
  hotGoodsActive?: boolean
}

/** GET — pending queue items. */
export async function GET() {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const items = await listPendingCommunityDrafts()
  return NextResponse.json({
    ok: true,
    items,
    calendarWindow: describeAuEditorialWindow(),
    autonomyNote:
      'Queue holds drafts only. Approve & publish still requires community:write. Nothing auto-publishes.',
  })
}

/**
 * POST — enqueue one draft, or generate this week's calendar suggestions into the queue.
 * Never publishes to community_posts.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action || 'enqueue'
  const createdBy =
    (typeof gate.user.email === 'string' && gate.user.email) ||
    gate.user.id ||
    undefined

  if (action === 'enqueue') {
    const topicId = String(body.topicId || '').trim()
    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
    }
    const item = buildQueuedDraftFromTopic({
      topicId,
      sourceNotes: body.sourceNotes ? String(body.sourceNotes) : undefined,
      customBrief: body.customBrief ? String(body.customBrief) : undefined,
      createdBy,
      source: 'compose',
      calendarWindow: describeAuEditorialWindow(),
    })
    await upsertQueuedCommunityDraft(item)
    const items = await listPendingCommunityDrafts()
    return NextResponse.json({ ok: true, item, items })
  }

  if (action === 'generate_week') {
    const existing = await readCommunityDraftQueue()
    const calendarWindow = describeAuEditorialWindow()
    const plans = planWeekSuggestionEnqueue(existing, {
      forceMarketS: Boolean(body.forceMarketS),
      hotGoodsActive: Boolean(body.hotGoodsActive),
    })
    const { next, added, skipped } = applyWeekEnqueuePlan(existing, plans, {
      createdBy,
      calendarWindow,
    })
    await replaceCommunityDraftQueue(next)
    const items = await listPendingCommunityDrafts()
    return NextResponse.json({
      ok: true,
      added,
      skipped,
      items,
      calendarWindow,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
