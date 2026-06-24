import { NextResponse } from 'next/server'

import { fetchAdminInboundSummary } from '@/lib/server/adminInboundSummary'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

/** Unified pending counts for all customer → admin inbound channels. */
export async function GET() {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const summary = await fetchAdminInboundSummary()
    return NextResponse.json({ ok: true, ...summary })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}
