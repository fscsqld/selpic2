import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyAdminsOfContactMessage } from '@/lib/server/adminInboundNotify'

type ContactCategory =
  | 'general'
  | 'market_s'
  | 'order'
  | 'technical'
  | 'business'
  | 'complaint'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: string
          email?: string
          subject?: string
          message?: string
          category?: ContactCategory
        }
      | null

    const name = (body?.name || '').trim()
    const email = (body?.email || '').trim()
    const subject = (body?.subject || '').trim()
    const message = (body?.message || '').trim()
    const category = (body?.category || 'general') as ContactCategory

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'INVALID_EMAIL' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
        category,
        status: 'new',
        priority: 'medium',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_INSERT_FAILED', details: error.message },
        { status: 500 }
      )
    }

    const messageId = String(data?.id || '')

    // Await Resend before responding — same as Bespoke. `void notify` was dropped after the
    // handler returned (Next 16 / serverless), so saves succeeded but company email never sent.
    let adminNotifyOk = false
    let adminNotifyError: string | undefined
    if (messageId) {
      try {
        const notifyResult = await notifyAdminsOfContactMessage({
          id: messageId,
          name,
          email,
          subject,
          message,
          category,
        })
        adminNotifyOk = notifyResult.ok
        if (!notifyResult.ok) {
          adminNotifyError = notifyResult.logMessage
          console.warn('[contact] admin notify failed:', notifyResult.logMessage)
        }
      } catch (err) {
        adminNotifyError = err instanceof Error ? err.message : 'Admin notify failed'
        console.warn('[contact] admin notify threw:', adminNotifyError)
      }
    }

    return NextResponse.json({
      ok: true,
      id: data?.id || null,
      adminNotifyOk,
      ...(adminNotifyError ? { adminNotifyError } : {}),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

