import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

export async function GET(req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 200)))

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('newsletter_campaigns')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, campaigns: data || [] })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | {
        subject?: string
        message?: string
        type?: string
        sent_by?: string
        recipient_count?: number
        success_count?: number
        failed_count?: number
        status?: string
        recipient_ids?: string[] | null
      }
    | null

  const subject = (body?.subject || '').trim()
  const message = (body?.message || '').trim()
  if (!subject || !message) {
    return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('newsletter_campaigns')
      .insert({
        subject,
        message,
        type: body?.type || 'general',
        sent_by: body?.sent_by || null,
        recipient_count: Number(body?.recipient_count ?? 0),
        success_count: body?.success_count ?? null,
        failed_count: body?.failed_count ?? null,
        status: body?.status || 'sent',
        recipient_ids: body?.recipient_ids ?? null,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_INSERT_FAILED', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, id: data?.id || null })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}
