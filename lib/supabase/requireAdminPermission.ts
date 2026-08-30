import 'server-only'

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

import { adminHasAllPermissions } from '@/lib/adminPermissionCheck'
import { mapSupabaseUserToAdminUser } from '@/lib/supabase/mapSupabaseAdminUser'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

export type AdminPermissionGate =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string }

/** Registry admin session plus one or more permission strings (legacy aliases honoured). */
export async function requireAdminPermission(
  required: string | string[]
): Promise<AdminPermissionGate> {
  const user = await requireSupabaseAdminUser()
  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const admin = mapSupabaseUserToAdminUser(user)
  const requiredList = Array.isArray(required) ? required : [required]
  if (!adminHasAllPermissions(admin, requiredList)) {
    return { ok: false, status: 403, error: 'Forbidden — insufficient permissions.' }
  }

  return { ok: true, user }
}

/** JSON 401/403 for routes using `{ ok: false, error: 'UNAUTHORIZED' }` envelopes. */
export function adminPermissionDeniedOkEnvelope(gate: AdminPermissionGate): NextResponse | null {
  if (gate.ok) return null
  return NextResponse.json(
    { ok: false, error: gate.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' },
    { status: gate.status }
  )
}

/** JSON 401/403 for routes using `{ error: string }` envelopes. */
export function adminPermissionDeniedPlain(gate: AdminPermissionGate): NextResponse | null {
  if (gate.ok) return null
  return NextResponse.json({ error: gate.error }, { status: gate.status })
}
