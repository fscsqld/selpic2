import { NextResponse } from 'next/server'
import {
  evaluateAdminRegistryForSessionUser,
  getUserForAdminApiRequest,
} from '@/lib/supabase/adminEmailRegistryServer'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Admin login helper: when `admin_email_registry` is in use (table OK + ≥1 row), require an active
 * `admin` or `super_admin` row for this email. Otherwise JWT-based bootstrap still applies.
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

  const gate = await evaluateAdminRegistryForSessionUser(user)
  return NextResponse.json({
    rosterEnforced: gate.rosterEnforced,
    onRoster: gate.onRoster,
    active: gate.active,
    reason: (gate.reason ?? 'enforced') as string,
  })
}
