import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  OUTREACH_REPLY_INTENTS,
  type OutreachReplyIntent,
} from '@/lib/fundraising/outreachReplyClassify'
import { polishOutreachFollowUpDraftWithLlm } from '@/lib/fundraising/outreachReplyDraftLlm'

export const dynamic = 'force-dynamic'

type DraftBody = {
  subject?: string
  organizationName?: string
  targetId?: string
  intent?: string
  excerpt?: string
  existingSubject?: string
  existingText?: string
  /** Opt-in AI polish — default false (Regenerate template stays free). */
  useLlm?: boolean
}

function isOutreachIntent(raw: string): raw is OutreachReplyIntent {
  return (OUTREACH_REPLY_INTENTS as readonly string[]).includes(raw)
}

/**
 * POST — HITL Needs-reply follow-up draft.
 * Template by default; useLlm:true polishes with OpenAI when configured.
 * Never sends email — Send follow-up stays on the replies route.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['fundraising:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  let body: DraftBody
  try {
    body = (await req.json()) as DraftBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const intentRaw = String(body.intent || '').trim()
  if (!intentRaw || !isOutreachIntent(intentRaw)) {
    return NextResponse.json(
      { error: 'intent must be a valid outreach reply intent' },
      { status: 400 }
    )
  }

  const draft = await polishOutreachFollowUpDraftWithLlm({
    input: {
      subject: String(body.subject || ''),
      organizationName: body.organizationName
        ? String(body.organizationName)
        : undefined,
      targetId: body.targetId ? String(body.targetId) : undefined,
      intent: intentRaw,
      excerpt: body.excerpt ? String(body.excerpt) : undefined,
      existingSubject: body.existingSubject
        ? String(body.existingSubject)
        : undefined,
      existingText: body.existingText ? String(body.existingText) : undefined,
    },
    useLlm: body.useLlm === true,
  })

  return NextResponse.json({ ok: true, draft })
}
