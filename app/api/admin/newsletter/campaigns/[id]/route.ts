import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  adminPermissionDeniedOkEnvelope,
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminPermission('newsletter:write')
  const denied = adminPermissionDeniedOkEnvelope(gate)
  if (denied) return denied
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('newsletter_campaigns').delete().eq('id', id)
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
