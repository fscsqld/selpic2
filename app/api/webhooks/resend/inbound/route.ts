import { NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { ingestFundraisingOutreachReply } from '@/lib/fundraising/outreachReply'
import {
  fetchResendReceivedEmail,
  textFromResendReceivedEmail,
} from '@/lib/fundraising/resendReceivedEmail'
import { verifyResendInboundWebhookRequest } from '@/lib/fundraising/verifyResendInboundWebhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Resend inbound webhook for Fundraising outreach replies.
 *
 * Official Resend `email.received` payloads are metadata-only — we fetch body via
 * GET /emails/receiving/{email_id}. Legacy/simple JSON with text/body still works.
 *
 * Auth (prefer Svix): RESEND_WEBHOOK_SECRET + svix-* headers (Resend Dashboard signing secret).
 * Legacy only when Svix secret unset: RESEND_INBOUND_WEBHOOK_SECRET via x-selpic-webhook-secret / Bearer
 * (Fundraising-only; not related to SELPIC-X).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const verified = await verifyResendInboundWebhookRequest(req)
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status })
  }

  try {
    const body = verified.body
    const data = (body.data as Record<string, unknown> | undefined) || undefined
    const emailObj = (body.email as Record<string, unknown> | undefined) || undefined
    const eventType = String(body.type || '').trim()

    let from =
      pickEmail(body.from) || pickEmail(data?.from) || pickEmail(emailObj?.from)
    let subject = String(body.subject || data?.subject || emailObj?.subject || '')
    let text = String(
      body.text || body.body || data?.text || emailObj?.text || data?.body || ''
    )
    const emailId = String(
      data?.email_id || body.email_id || emailObj?.id || data?.id || ''
    ).trim()
    let messageId = String(
      body.message_id ||
        body.messageId ||
        data?.message_id ||
        emailObj?.message_id ||
        emailId ||
        body.id ||
        ''
    ).trim()

    // Official Resend receiving webhook: fetch full content when text missing
    const looksLikeResendReceived =
      eventType === 'email.received' || (Boolean(emailId) && !text.trim())
    let fetchedBody = false
    if (looksLikeResendReceived && emailId) {
      const fetched = await fetchResendReceivedEmail(emailId)
      if (fetched.ok) {
        fetchedBody = true
        if (!from) from = pickEmail(fetched.email.from)
        if (!subject) subject = String(fetched.email.subject || '')
        text = textFromResendReceivedEmail(fetched.email) || text
        if (fetched.email.message_id) {
          messageId = String(fetched.email.message_id)
        } else if (!messageId) {
          messageId = emailId
        }
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: fetched.error,
            emailId,
            hint: 'Webhook metadata received but body fetch failed. Check RESEND_API_KEY and Receiving access.',
          },
          { status: 502 }
        )
      }
    }

    if (!from) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No from address' })
    }

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
      fetchedBody,
      emailId: emailId || undefined,
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
