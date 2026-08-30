import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import {
  ensureFundraisingOutreachUnsubscribeToken,
  getFundraisingOutreachTargetById,
  upsertFundraisingOutreachTarget,
} from '@/lib/fundraising/persistence'
import {
  buildFundraisingOutreachApplyUrl,
  buildFundraisingOutreachEmail,
  buildFundraisingOutreachUnsubscribeApiUrl,
  buildFundraisingOutreachUnsubscribeUrl,
} from '@/lib/fundraising/outreachEmail'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import type { FundraisingOutreachTarget } from '@/lib/fundraising/types'

/** Hard cap per request — prevents accidental mass blast (daily cron is a later wave). */
const MAX_SEND_PER_REQUEST = 10

type SendBody = {
  targetIds?: string[]
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as SendBody | null
    const ids = Array.from(
      new Set(
        (Array.isArray(body?.targetIds) ? body!.targetIds : [])
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    )

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one target.' }, { status: 400 })
    }
    if (ids.length > MAX_SEND_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Select at most ${MAX_SEND_PER_REQUEST} targets per send (v1 safety cap).`,
        },
        { status: 400 }
      )
    }

    const results: Array<{
      id: string
      ok: boolean
      skipped?: boolean
      reason?: string
      status?: string
    }> = []

    for (const id of ids) {
      let target = await getFundraisingOutreachTargetById(id)
      if (!target) {
        results.push({ id, ok: false, reason: 'Target not found' })
        continue
      }
      if (target.status === 'OPTED_OUT') {
        results.push({ id, ok: true, skipped: true, reason: 'Opted out', status: target.status })
        continue
      }
      if (target.status === 'CONVERTED') {
        results.push({
          id,
          ok: true,
          skipped: true,
          reason: 'Already converted',
          status: target.status,
        })
        continue
      }
      const email = String(target.contactEmail || '').trim().toLowerCase()
      if (!email || !email.includes('@')) {
        results.push({ id, ok: false, reason: 'Missing contact email', status: target.status })
        continue
      }

      const ensured = await ensureFundraisingOutreachUnsubscribeToken(target)
      if (!ensured.ok) {
        results.push({ id, ok: false, reason: ensured.error, status: target.status })
        continue
      }
      target = ensured.target

      const applyUrl = buildFundraisingOutreachApplyUrl(target.id)
      const unsubscribeUrl = buildFundraisingOutreachUnsubscribeUrl(ensured.token)
      const listUnsubscribeUrl = buildFundraisingOutreachUnsubscribeApiUrl(ensured.token)
      const rendered = buildFundraisingOutreachEmail({
        target,
        applyUrl,
        unsubscribeUrl,
        listUnsubscribeUrl,
      })

      // Outreach: skip transactional confidentiality footer; template includes Spam Act identity + unsub.
      const sent = await sendEmailViaResendServer({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: rendered.headers,
        replyTo: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
        skipBranding: true,
        skipTracking: true,
      })

      const now = new Date().toISOString()
      if (!sent.ok) {
        const failed: FundraisingOutreachTarget = {
          ...target,
          status: 'FAILED',
          lastError: sent.logMessage,
          updatedAt: now,
        }
        await upsertFundraisingOutreachTarget(failed)
        results.push({ id, ok: false, reason: sent.logMessage, status: 'FAILED' })
        continue
      }

      const contacted: FundraisingOutreachTarget = {
        ...target,
        status: 'CONTACTED',
        lastSentAt: now,
        lastError: undefined,
        updatedAt: now,
        payload: {
          ...(target.payload || {}),
          lastTemplateSubject: rendered.subject,
        },
      }
      await upsertFundraisingOutreachTarget(contacted)
      results.push({ id, ok: true, status: 'CONTACTED' })
    }

    const sent = results.filter((r) => r.ok && !r.skipped).length
    const failed = results.filter((r) => !r.ok).length
    const skipped = results.filter((r) => r.skipped).length

    return NextResponse.json({
      ok: failed === 0,
      sent,
      failed,
      skipped,
      maxPerRequest: MAX_SEND_PER_REQUEST,
      results,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Send failed' },
      { status: 500 }
    )
  }
}
