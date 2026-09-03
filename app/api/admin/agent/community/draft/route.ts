import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  buildCommunityPostDraft,
  buildCommunityDraftCatalogue,
  type CommunityDraftTopicId,
} from '@/lib/agent/communityDraft'

export const dynamic = 'force-dynamic'

type DraftBody = {
  topicId?: string
  sourceNotes?: string
  customBrief?: string
}

/**
 * POST — generate a HITL community post draft (template, not LLM).
 * Does not write to community_posts. Publish stays on Approve + community:write.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  let body: DraftBody
  try {
    body = (await req.json()) as DraftBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const topicId = String(body.topicId || '').trim()
  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
  }

  const draft = buildCommunityPostDraft({
    topicId: topicId as CommunityDraftTopicId,
    sourceNotes: body.sourceNotes ? String(body.sourceNotes) : undefined,
    customBrief: body.customBrief ? String(body.customBrief) : undefined,
  })

  const catalogue = buildCommunityDraftCatalogue()

  return NextResponse.json({
    ok: true,
    draft,
    topics: catalogue.topics,
    calendarWindow: catalogue.calendarWindow,
    suggestedTopics: catalogue.suggestedTopics,
    visionNote: catalogue.visionNote,
  })
}

/** GET — topic catalogue + AU calendar suggestions for the workspace picker. */
export async function GET() {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const catalogue = buildCommunityDraftCatalogue()
  return NextResponse.json({
    ok: true,
    ...catalogue,
  })
}
