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

export type AdminRegistryGate = {
  rosterEnforced: boolean
  onRoster: boolean
  /** Row exists, is_active, and role is `admin` or `super_admin`. */
  active: boolean
  registryRole: 'admin' | 'super_admin' | null
  reason?: string
}

/**
 * When the registry table is readable and has at least one row, access is **enforced** from the DB.
 * If the table is missing, unreadable, or empty, `rosterEnforced` is false (JWT-based admin bootstrap still allowed).
 */
export async function evaluateAdminRegistryForSessionUser(user: User): Promise<AdminRegistryGate> {
  if (!isSupabaseConfigured()) {
    return {
      rosterEnforced: false,
      onRoster: false,
      active: false,
      registryRole: null,
      reason: 'service_not_configured',
    }
  }

  const sb = getSupabaseAdmin()
  const { count, error: countErr } = await sb
    .from('admin_email_registry')
    .select('email', { count: 'exact', head: true })

  if (countErr) {
    console.warn('[evaluateAdminRegistryForSessionUser] count:', countErr.message)
    return {
      rosterEnforced: false,
      onRoster: false,
      active: false,
      registryRole: null,
      reason: 'registry_unavailable',
    }
  }

  if ((count ?? 0) === 0) {
    return {
      rosterEnforced: false,
      onRoster: false,
      active: false,
      registryRole: null,
      reason: 'registry_empty',
    }
  }

  const email = normalizeAdminEmail(user.email ?? '')
  const { data, error } = await sb
    .from('admin_email_registry')
    .select('email, is_active, role')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.warn('[evaluateAdminRegistryForSessionUser] read:', error.message)
    return {
      rosterEnforced: false,
      onRoster: false,
      active: false,
      registryRole: null,
      reason: 'registry_read_failed',
    }
  }

  const onRoster = !!data
  const role = data?.role
  const okRole = role === 'admin' || role === 'super_admin'
  const active = !!(data && data.is_active === true && okRole)
  const registryRole = active && okRole ? (role as 'admin' | 'super_admin') : null

  return {
    rosterEnforced: true,
    onRoster,
    active,
    registryRole,
    reason: 'enforced',
  }
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

/** Super admin only: JWT admin + when roster is enforced, an active `super_admin` row in `admin_email_registry`. */
export async function requireSuperAdminForRequest(req: Request): Promise<User | null> {
  const user = await getUserForAdminApiRequest(req)
  if (!user || !userHasAdminAccess(user)) return null
  const gate = await evaluateAdminRegistryForSessionUser(user)
  if (gate.rosterEnforced) {
    if (!gate.active || gate.registryRole !== 'super_admin') return null
    return user
  }
  if (!isSuperAdminUser(user)) return null
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
