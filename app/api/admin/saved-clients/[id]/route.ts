import { NextResponse } from 'next/server'

import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const safeId = String(id || '').trim()
  if (!safeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const sb = await createSupabaseServerClient()
  const { error } = await sb.from('admin_saved_clients').delete().eq('id', safeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

