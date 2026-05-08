import { NextResponse } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

export async function GET(req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 100)))

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, messages: data || [] })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

