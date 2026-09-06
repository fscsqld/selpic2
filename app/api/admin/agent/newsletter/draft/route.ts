import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  listNewsletterDraftTopics,
  resolveNewsletterDraftTopic,
} from '@/lib/agent/newsletterDraft'
import { buildNewsletterDraftWithOptionalLlm } from '@/lib/agent/newsletterDraftLlm'
import { isAgentOpenAiEnabled } from '@/lib/agent/agentOpenAiChat'

export const dynamic = 'force-dynamic'

type DraftBody = {
  topicId?: string
  sourceNotes?: string
  customBrief?: string
  useLlm?: boolean
  existingSubject?: string
  existingMessage?: string
}

/**
 * GET — topic catalogue for Newsletter assist (HITL).
 * Gate: newsletter:read or agent:read.
 */
export async function GET() {
  const gate = await requireAdminAnyPermission(['newsletter:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  return NextResponse.json({
    ok: true,
    topics: listNewsletterDraftTopics(),
    llmAvailable: isAgentOpenAiEnabled(process.env, 'AGENT_NEWSLETTER_DRAFT_LLM'),
    autonomyNote:
      'Draft only — Apply opens Newsletter admin. Never auto-send. Subscriber list only; never fundraising outreach_targets.',
  })
}

/**
 * POST — generate or polish a newsletter campaign draft.
 * Does not send email and does not touch outreach_targets.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['newsletter:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  let body: DraftBody
  try {
    body = (await req.json()) as DraftBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const topicId = String(body.topicId || '').trim()
  if (!topicId || !resolveNewsletterDraftTopic(topicId)) {
    return NextResponse.json({ error: 'topicId is required and must be a known topic' }, { status: 400 })
  }

  const draft = await buildNewsletterDraftWithOptionalLlm({
    topicId,
    sourceNotes: body.sourceNotes ? String(body.sourceNotes) : undefined,
    customBrief: body.customBrief ? String(body.customBrief) : undefined,
    useLlm: body.useLlm === true,
    existingSubject: body.existingSubject ? String(body.existingSubject) : undefined,
    existingMessage: body.existingMessage ? String(body.existingMessage) : undefined,
  })

  return NextResponse.json({
    ok: true,
    draft,
    autonomyNote: draft.autonomyNote,
  })
}
