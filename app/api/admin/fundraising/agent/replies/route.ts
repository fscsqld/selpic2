import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  buildOutreachFollowUpDraft,
  buildOutreachFunnelStats,
  closeOutreachReply,
} from '@/lib/fundraising/outreachReply'
import {
  getOutreachReplyById,
  listOutreachReplies,
  updateOutreachReply,
} from '@/lib/fundraising/outreachReplyPersistence'
import {
  OUTREACH_REPLY_INTENTS,
  type OutreachReplyIntent,
} from '@/lib/fundraising/outreachReplyClassify'
import { markFundraisingOutreachTargetOptedOut } from '@/lib/fundraising/persistence'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'

export async function GET(req: Request) {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const url = new URL(req.url)
  const statusRaw = url.searchParams.get('status') || 'open'
  const status = statusRaw === 'closed' || statusRaw === 'all' ? statusRaw : 'open'
  const includeFunnel = url.searchParams.get('funnel') === '1'

  try {
    const replies =
      status === 'all'
        ? await listOutreachReplies({ limit: 100 })
        : await listOutreachReplies({
            status: status === 'closed' ? 'closed' : 'open',
            limit: 100,
          })

    const withDrafts = replies.map((r) => ({
      ...r,
      draft: buildOutreachFollowUpDraft(r),
    }))

    const funnel = includeFunnel ? await buildOutreachFunnelStats() : undefined

    return NextResponse.json({
      ok: true,
      replies: withDrafts,
      funnel,
      warning: !isSupabaseConfigured() ? 'Supabase not configured' : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list replies' },
      { status: 500 }
    )
  }
}

type Body = {
  id?: string
  action?: 'handle' | 'opt_out' | 'reclassify' | 'send_draft'
  intent?: string
  note?: string
  subject?: string
  text?: string
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const id = String(body?.id || '').trim()
    const action = String(body?.action || '').trim()
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    }

    const existing = await getOutreachReplyById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    const handledBy =
      gate.user.email ||
      (gate.user.user_metadata?.username as string | undefined) ||
      gate.user.id ||
      'admin'

    if (action === 'reclassify') {
      const intent = String(body?.intent || '').trim() as OutreachReplyIntent
      if (!OUTREACH_REPLY_INTENTS.includes(intent)) {
        return NextResponse.json({ error: 'Invalid intent' }, { status: 400 })
      }
      const updated = await updateOutreachReply(id, {
        intent,
        adminNote: body?.note ? String(body.note).slice(0, 500) : existing.adminNote,
      })
      if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 500 })
      return NextResponse.json({ ok: true, reply: updated.reply })
    }

    if (action === 'opt_out') {
      if (existing.fromEmail) {
        await markFundraisingOutreachTargetOptedOut({
          contactEmail: existing.fromEmail,
          source: 'reply',
        })
      }
      const closed = await closeOutreachReply({
        id,
        reason: 'admin_opt_out',
        handledBy,
        note: body?.note,
      })
      if (!closed.ok) return NextResponse.json({ error: closed.error }, { status: 500 })
      return NextResponse.json({ ok: true, reply: closed.reply, optedOut: true })
    }

    if (action === 'handle') {
      const closed = await closeOutreachReply({
        id,
        reason: 'admin_handled',
        handledBy,
        note: body?.note,
      })
      if (!closed.ok) return NextResponse.json({ error: closed.error }, { status: 500 })
      return NextResponse.json({ ok: true, reply: closed.reply })
    }

    if (action === 'send_draft') {
      const draft = buildOutreachFollowUpDraft(existing)
      const subject = String(body?.subject || draft.subject).trim()
      const text = String(body?.text || draft.text).trim()
      if (!existing.fromEmail) {
        return NextResponse.json({ error: 'Reply has no from email' }, { status: 400 })
      }
      if (!subject || !text) {
        return NextResponse.json({ error: 'Subject and text are required' }, { status: 400 })
      }

      const sent = await sendEmailViaResendServer({
        to: existing.fromEmail,
        subject,
        text,
        html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        skipBranding: true,
        skipTracking: true,
      })
      if (!sent.ok) {
        return NextResponse.json(
          { error: sent.logMessage || 'Send failed' },
          { status: 502 }
        )
      }

      const closed = await closeOutreachReply({
        id,
        reason: 'admin_sent_reply',
        handledBy,
        note: body?.note || `Sent follow-up · ${subject}`.slice(0, 500),
      })
      if (!closed.ok) return NextResponse.json({ error: closed.error }, { status: 500 })
      return NextResponse.json({ ok: true, reply: closed.reply, sent: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reply action failed' },
      { status: 500 }
    )
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
