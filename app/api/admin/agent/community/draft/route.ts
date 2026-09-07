import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  buildCommunityPostDraft,
  buildCommunityDraftCatalogue,
  type CommunityDraftResult,
  type CommunityDraftTopicId,
} from '@/lib/agent/communityDraft'
import { polishCommunityDraftWithLlm } from '@/lib/agent/communityDraftLlm'
import { agentAdminLabelFromUser } from '@/lib/agent/agentAdminLabel'
import {
  COMMUNITY_POST_CATEGORIES,
  type CanonicalPostCategory,
} from '@/lib/community/navCategories'

export const dynamic = 'force-dynamic'

type DraftBody = {
  topicId?: string
  sourceNotes?: string
  customBrief?: string
  /** Opt-in AI polish — default false (Generate this week / Generate draft stay free). */
  useLlm?: boolean
  /** When polishing a queue edit, pass current title/body instead of rebuilding template. */
  existingTitle?: string
  existingContent?: string
  existingCategory?: string
}

/**
 * POST — generate a HITL community post draft (template by default).
 * Set useLlm:true to polish with OpenAI when key is set.
 * Does not write to community_posts. Publish stays on Approve + community:write.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission([
    'community:read',
    'agent:read',
    'agent:run',
  ])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied
  if (!gate.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const useLlm = body.useLlm === true
  const existingTitle = body.existingTitle ? String(body.existingTitle).trim() : ''
  const existingContent = body.existingContent ? String(body.existingContent).trim() : ''

  let template: CommunityDraftResult
  if (useLlm && existingTitle && existingContent) {
    const base = buildCommunityPostDraft({
      topicId: topicId as CommunityDraftTopicId,
      sourceNotes: body.sourceNotes ? String(body.sourceNotes) : undefined,
      customBrief: body.customBrief ? String(body.customBrief) : undefined,
    })
    const catRaw = body.existingCategory ? String(body.existingCategory) : base.category
    const category = (COMMUNITY_POST_CATEGORIES as readonly string[]).includes(catRaw)
      ? (catRaw as CanonicalPostCategory)
      : base.category
    template = {
      ...base,
      title: existingTitle,
      content: existingContent,
      category,
    }
  } else {
    template = buildCommunityPostDraft({
      topicId: topicId as CommunityDraftTopicId,
      sourceNotes: body.sourceNotes ? String(body.sourceNotes) : undefined,
      customBrief: body.customBrief ? String(body.customBrief) : undefined,
    })
  }

  const draft = await polishCommunityDraftWithLlm({
    template,
    useLlm,
    usage: useLlm
      ? {
          sector: 'community',
          action: 'polish_community_draft',
          adminLabel: agentAdminLabelFromUser(gate.user),
        }
      : undefined,
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
