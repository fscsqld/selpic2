import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  const body = (await req.json().catch(() => null)) as { is_active?: boolean } | null
  const patch: Record<string, unknown> = {}
  if (typeof body?.is_active === 'boolean') {
    patch.is_active = body.is_active
    if (body.is_active === false) {
      patch.unsubscribed_at = new Date().toISOString()
    } else {
      patch.unsubscribed_at = null
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'NO_UPDATES' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('newsletter_subscribers').update(patch).eq('id', id)
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_UPDATE_FAILED', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
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
    const { error } = await admin.from('newsletter_subscribers').delete().eq('id', id)
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
