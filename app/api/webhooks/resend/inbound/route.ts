import { NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  ingestFundraisingOutreachReply,
} from '@/lib/fundraising/outreachReply'

export const dynamic = 'force-dynamic'

/**
 * Resend inbound (or compatible) webhook for Fundraising outreach replies.
 * - unsubscribe / wrong person → OPTED_OUT (+ reply log)
 * - interested / question / other → Needs-reply queue
 *
 * Configure Resend inbound → POST this URL.
 * Optional: header `x-selpic-webhook-secret` === RESEND_INBOUND_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const expected = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim()
  if (expected) {
    const headerSecret = req.headers.get('x-selpic-webhook-secret')?.trim()
    const auth = req.headers.get('authorization')?.trim() || ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (headerSecret !== expected && bearer !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const data = (body.data as Record<string, unknown> | undefined) || undefined
    const email = (body.email as Record<string, unknown> | undefined) || undefined

    const from =
      pickEmail(body.from) ||
      pickEmail(data?.from) ||
      pickEmail(email?.from)

    const subject = String(body.subject || data?.subject || email?.subject || '')
    const text = String(
      body.text || body.body || data?.text || email?.text || data?.body || ''
    )
    const messageId = String(
      body.message_id ||
        body.messageId ||
        data?.email_id ||
        data?.message_id ||
        data?.id ||
        email?.id ||
        body.id ||
        ''
    ).trim()

    const result = await ingestFundraisingOutreachReply({
      fromEmail: from,
      subject,
      text,
      messageId: messageId || undefined,
    })

    return NextResponse.json({
      ok: result.ok,
      skipped: result.skipped,
      reason: result.reason,
      optedOut: result.optedOut,
      targetId: result.targetId,
      replyId: result.reply?.id,
      intent: result.reply?.intent,
      status: result.reply?.status,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 500 }
    )
  }
}

function pickEmail(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') {
    const m = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    return (m?.[0] || raw).trim().toLowerCase()
  }
  if (typeof raw === 'object' && raw !== null && 'address' in raw) {
    return String((raw as { address?: string }).address || '')
      .trim()
      .toLowerCase()
  }
  if (Array.isArray(raw) && raw[0]) return pickEmail(raw[0])
  return ''
}
