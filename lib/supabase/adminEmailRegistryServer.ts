import 'server-only'

import { createClient, type User } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isSuperAdminUser(user: User): boolean {
  const m = user.app_metadata || {}
  const u = user.user_metadata || {}
  return (
    m.role === 'super_admin' ||
    m.role === 'superadmin' ||
    u.role === 'super_admin'
  )
}

export function parseBearer(req: Request): string | null {
  const h = req.headers.get('authorization')
  if (!h?.toLowerCase().startsWith('bearer ')) return null
  const t = h.slice(7).trim()
  return t || null
}

export async function getUserFromBearer(accessToken: string | null | undefined): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon || !accessToken?.trim()) return null
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(accessToken.trim())
  if (error || !user) return null
  return user
}

export async function getUserForAdminApiRequest(req: Request): Promise<User | null> {
  const token = parseBearer(req)
  if (token) {
    const u = await getUserFromBearer(token)
    if (u) return u
  }
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (!error && user) return user
  } catch {
    /* cookies unavailable */
  }
  return null
}

/** Super admin only (JWT + registry writes). */
export async function requireSuperAdminForRequest(req: Request): Promise<User | null> {
  const user = await getUserForAdminApiRequest(req)
  if (!user || !userHasAdminAccess(user) || !isSuperAdminUser(user)) return null
  return user
}

export async function findAuthUserIdByEmail(normalizedEmail: string): Promise<string | null> {
  const sb = getSupabaseAdmin()
  let page = 1
  const perPage = 200
  const maxPages = 25
  while (page <= maxPages) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users ?? []
    const hit = users.find((u) => normalizeAdminEmail(u.email ?? '') === normalizedEmail)
    if (hit?.id) return hit.id
    if (users.length < perPage) return null
    page += 1
  }
  return null
}

/**
 * Apply or revoke admin JWT claims from `admin_email_registry` for this user.
 * Only mutates app_metadata when the row is active (grant) or row is missing/inactive and `selpic_registry` was set by us (revoke).
 */
export async function syncAuthUserFromRegistry(userId: string, email: string): Promise<{ updated: boolean }> {
  if (!isSupabaseConfigured()) return { updated: false }

  const sb = getSupabaseAdmin()
  const normalized = normalizeAdminEmail(email)

  const { data: row, error: rowErr } = await sb
    .from('admin_email_registry')
    .select('email, role, permissions, is_active')
    .eq('email', normalized)
    .maybeSingle()

  if (rowErr) {
    console.error('[syncAuthUserFromRegistry] registry read', rowErr.message)
    throw new Error('Registry read failed')
  }

  const { data: existingData, error: getErr } = await sb.auth.admin.getUserById(userId)
  if (getErr || !existingData?.user) {
    console.error('[syncAuthUserFromRegistry] getUser', getErr?.message)
    throw new Error('User lookup failed')
  }

  const authUser = existingData.user
  const meta = { ...(authUser.app_metadata as Record<string, unknown>) }
  const registryManaged = meta.selpic_registry === true

  const apply =
    row &&
    row.is_active === true &&
    (row.role === 'admin' || row.role === 'super_admin')

  if (apply) {
    meta.admin = true
    meta.role = row.role
    meta.permissions = Array.isArray(row.permissions) ? row.permissions : []
    meta.selpic_registry = true
  } else if (registryManaged) {
    meta.admin = false
    delete meta.role
    delete meta.permissions
    meta.selpic_registry = false
  } else {
    return { updated: false }
  }

  const { error: upErr } = await sb.auth.admin.updateUserById(userId, {
    app_metadata: meta,
  })
  if (upErr) {
    console.error('[syncAuthUserFromRegistry] updateUser', upErr.message)
    throw new Error(upErr.message)
  }

  return { updated: true }
}

export async function pushRegistryToAuthUserByEmail(email: string): Promise<void> {
  const normalized = normalizeAdminEmail(email)
  const userId = await findAuthUserIdByEmail(normalized)
  if (!userId) return
  await syncAuthUserFromRegistry(userId, email)
}
