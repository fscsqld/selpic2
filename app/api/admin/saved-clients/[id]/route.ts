import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminPermission('documents:write')
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const { id } = await ctx.params
  const safeId = String(id || '').trim()
  if (!safeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const sb = await createSupabaseServerClient()
  const { error } = await sb.from('admin_saved_clients').delete().eq('id', safeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

