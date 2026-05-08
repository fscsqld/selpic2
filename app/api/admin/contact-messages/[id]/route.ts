import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

type ContactMessageStatus = 'new' | 'read' | 'replied' | 'closed'
type ContactMessagePriority = 'low' | 'medium' | 'high' | 'urgent'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  const body = (await req.json().catch(() => null)) as
    | {
        status?: ContactMessageStatus
        priority?: ContactMessagePriority
        admin_notes?: string | null
      }
    | null

  const update: Record<string, unknown> = {}

  if (body?.status) {
    update.status = body.status
    if (body.status === 'read') update.read_at = new Date().toISOString()
    if (body.status === 'replied') update.replied_at = new Date().toISOString()
  }

  if (body?.priority) update.priority = body.priority
  if (Object.prototype.hasOwnProperty.call(body || {}, 'admin_notes')) {
    const v = typeof body?.admin_notes === 'string' ? body.admin_notes : null
    update.admin_notes = v
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: 'NO_UPDATES' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('contact_messages')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_UPDATE_FAILED', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('contact_messages').delete().eq('id', id)
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_DELETE_FAILED', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

