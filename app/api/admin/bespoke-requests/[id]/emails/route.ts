import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const { data, error } = await admin
      .from('bespoke_request_emails')
      .select('*')
      .eq('bespoke_request_id', id)
      .order('sent_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, emails: data || [] })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}
