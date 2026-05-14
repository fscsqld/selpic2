import { NextResponse } from 'next/server'
import { evaluateAdminRegistryForSessionUser } from '@/lib/supabase/adminEmailRegistryServer'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Cookie-session check: allowed to use the admin app when roster is enforced (active admin/super_admin row)
 * or when roster is not enforced and JWT has admin access.
 */
export async function GET() {
  const user = await getSupabaseSessionUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    if (!userHasAdminAccess(user)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ ok: true, mode: 'jwt_only' as const })
  }

  const gate = await evaluateAdminRegistryForSessionUser(user)
  if (gate.rosterEnforced) {
    if (!gate.active) {
      return NextResponse.json({ ok: false, error: 'not_on_active_roster', reason: gate.reason }, { status: 403 })
    }
    if (!userHasAdminAccess(user)) {
      return NextResponse.json({ ok: false, error: 'jwt_not_admin' }, { status: 403 })
    }
    return NextResponse.json({ ok: true, mode: 'registry' as const })
  }

  if (!userHasAdminAccess(user)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true, mode: 'jwt_fallback' as const })
}
