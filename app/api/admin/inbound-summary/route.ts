import { NextResponse } from 'next/server'

import { fetchAdminInboundSummary } from '@/lib/server/adminInboundSummary'
import {
  adminPermissionDeniedOkEnvelope,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'

/** Unified pending counts for all customer → admin inbound channels. */
export async function GET() {
  const gate = await requireAdminPermission('dashboard:read')
  const denied = adminPermissionDeniedOkEnvelope(gate)
  if (denied) return denied

  try {
    const summary = await fetchAdminInboundSummary()
    return NextResponse.json({ ok: true, ...summary })
  } catch {
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}
