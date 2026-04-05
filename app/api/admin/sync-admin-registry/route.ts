import { NextResponse } from 'next/server'
import {
  getUserForAdminApiRequest,
  syncAuthUserFromRegistry,
} from '@/lib/supabase/adminEmailRegistryServer'
import { isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Applies `admin_email_registry` to the caller's auth user (app_metadata).
 * Call after sign-in and periodically while using the admin app so permission changes propagate.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const user = await getUserForAdminApiRequest(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { updated } = await syncAuthUserFromRegistry(user.id, user.email)
    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed'
    console.error('[sync-admin-registry]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
