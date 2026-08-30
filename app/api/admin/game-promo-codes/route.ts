import { NextResponse } from 'next/server'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  adminPermissionDeniedOkEnvelope,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'

export async function GET(req: Request) {
  const gate = await requireAdminPermission('analytics:read')
  const denied = adminPermissionDeniedOkEnvelope(gate)
  if (denied) return denied

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const url = new URL(req.url)
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 150)))

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('game_promo_registrations')
      .select('id,code,source,score,level,client_ip,created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      const msg = error.message || ''
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json(
          {
            ok: false,
            error: 'TABLE_MISSING',
            details: 'Run docs/game-promo-codes-supabase.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: msg },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e) {
    console.error('[admin/game-promo-codes]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}
