import { NextResponse } from 'next/server'
import {
  getUserForAdminApiRequest,
  normalizeAdminEmail,
} from '@/lib/supabase/adminEmailRegistryServer'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Admin login helper: when `admin_email_registry` is in use (table OK + ≥1 row), require an active row for this email.
 * If the table is missing, unreadable, or empty, `rosterEnforced` is false so JWT-based admin access still works.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      rosterEnforced: false,
      onRoster: false,
      active: false,
      reason: 'service_not_configured' as const,
    })
  }

  const user = await getUserForAdminApiRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSupabaseAdmin()
  const { count, error: countErr } = await sb
    .from('admin_email_registry')
    .select('email', { count: 'exact', head: true })

  if (countErr) {
    console.warn('[me-on-registry] count (registry optional):', countErr.message)
    return NextResponse.json({
      rosterEnforced: false,
      onRoster: false,
      active: false,
      reason: 'registry_unavailable' as const,
    })
  }

  const rowCount = count ?? 0
  if (rowCount === 0) {
    return NextResponse.json({
      rosterEnforced: false,
      onRoster: false,
      active: false,
      reason: 'registry_empty' as const,
    })
  }

  const email = normalizeAdminEmail(user.email)
  const { data, error } = await sb
    .from('admin_email_registry')
    .select('email, is_active')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.warn('[me-on-registry] row read (registry optional):', error.message)
    return NextResponse.json({
      rosterEnforced: false,
      onRoster: false,
      active: false,
      reason: 'registry_read_failed' as const,
    })
  }

  const onRoster = !!data
  const active = !!(data && data.is_active === true)
  return NextResponse.json({
    rosterEnforced: true,
    onRoster,
    active,
    reason: 'enforced' as const,
  })
}
