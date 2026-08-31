import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  buildInboundReplyDraft,
  type InboundDraftChannel,
} from '@/lib/agent/inboundDraft'

export const dynamic = 'force-dynamic'

type DraftBody = {
  channel?: InboundDraftChannel
  customerName?: string
  customerEmail?: string
  subject?: string
  bodyExcerpt?: string
  requestId?: string
}

/**
 * POST — generate a HITL reply draft (template, not LLM).
 * messages:read or bespoke:read required; send still happens client-side via emailService.
 */
export async function POST(req: Request) {
  const gate = await requireAdminAnyPermission(['messages:read', 'bespoke:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  let body: DraftBody
  try {
    body = (await req.json()) as DraftBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const channel = body.channel
  if (channel !== 'message' && channel !== 'bespoke') {
    return NextResponse.json({ error: 'channel must be message or bespoke' }, { status: 400 })
  }

  const draft = buildInboundReplyDraft({
    channel,
    customerName: String(body.customerName || ''),
    customerEmail: String(body.customerEmail || ''),
    subject: body.subject ? String(body.subject) : undefined,
    bodyExcerpt: body.bodyExcerpt ? String(body.bodyExcerpt) : undefined,
    requestId: body.requestId ? String(body.requestId) : undefined,
  })

  return NextResponse.json({ ok: true, draft })
}
