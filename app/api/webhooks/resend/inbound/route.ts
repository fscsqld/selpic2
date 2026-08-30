import { NextResponse } from 'next/server'

import {
  markFundraisingOutreachTargetOptedOut,
} from '@/lib/fundraising/persistence'
import { messageLooksLikeUnsubscribeRequest } from '@/lib/fundraising/outreachEmail'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Resend inbound (or compatible) webhook: if a reply contains "unsubscribe",
 * mark matching outreach target OPTED_OUT.
 *
 * Configure Resend inbound → POST this URL.
 * Optional shared secret: header `x-selpic-webhook-secret` === RESEND_INBOUND_WEBHOOK_SECRET
 * (or Authorization: Bearer …).
 *
 * This is best-effort automation — the List-Unsubscribe link remains the primary path.
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

    const from =
      pickEmail(body.from) ||
      pickEmail((body.data as Record<string, unknown> | undefined)?.from) ||
      pickEmail((body.email as Record<string, unknown> | undefined)?.from)

    const subject = String(
      body.subject ||
        (body.data as Record<string, unknown> | undefined)?.subject ||
        (body.email as Record<string, unknown> | undefined)?.subject ||
        ''
    )
    const text = String(
      body.text ||
        body.body ||
        (body.data as Record<string, unknown> | undefined)?.text ||
        (body.email as Record<string, unknown> | undefined)?.text ||
        ''
    )

    if (!from) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No from address' })
    }
    if (!messageLooksLikeUnsubscribeRequest(subject, text)) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Not an unsubscribe reply' })
    }

    const result = await markFundraisingOutreachTargetOptedOut({
      contactEmail: from,
      source: 'reply',
    })

    if (!result.ok) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.error,
      })
    }

    return NextResponse.json({
      ok: true,
      optedOut: true,
      already: Boolean(result.already),
      targetId: result.target.id,
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
