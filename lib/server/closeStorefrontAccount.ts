import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'
import { clearVipManualGradeOverride } from '@/lib/server/vipManualGradeOverridesStore'

function isMissingTableOrSchemaError(err: { message?: string; code?: string }): boolean {
  const m = (err.message || '').toLowerCase()
  return (
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    err.code === '42P01' ||
    err.code === 'PGRST205'
  )
}

async function tryDeleteWhere(
  sb: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<void> {
  const { error } = await sb.from(table).delete().eq(column, value)
  if (error && !isMissingTableOrSchemaError(error)) {
    console.warn(`[closeStorefrontAccount] ${table}.${column}:`, error.message)
  }
}

/**
 * Customer-initiated close: remove Auth login + non-order personal rows.
 * Never deletes `orders` (tax / dispute / shipping retention).
 * Distinct from admin DELETE which cascades orders via deletePublicDataForAuthUser.
 */
export async function closeStorefrontAuthAccountKeepingOrders(args: {
  sb: SupabaseClient
  userId: string
  email: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sb, userId, email } = args
  const emailNorm = (email || '').trim().toLowerCase()

  for (const { table, column } of [
    { table: 'product_likes', column: 'user_id' },
    { table: 'cart_items', column: 'user_id' },
    { table: 'cart_items', column: 'userId' },
    { table: 'user_cart', column: 'user_id' },
    { table: 'user_carts', column: 'user_id' },
    { table: 'shopping_cart_items', column: 'user_id' },
    { table: 'carts', column: 'user_id' },
  ] as const) {
    await tryDeleteWhere(sb, table, column, userId)
  }

  if (emailNorm) {
    const vip = await clearVipManualGradeOverride(emailNorm)
    if (!vip.ok) {
      console.warn('[closeStorefrontAccount] VIP override clear:', vip.error)
    }
  }

  const { error: profileError } = await sb.from('profiles').delete().eq('id', userId)
  if (profileError && !isMissingTableOrSchemaError(profileError)) {
    console.warn('[closeStorefrontAccount] profiles:', profileError.message)
  }

  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) {
    return { ok: false, error: error.message || 'Could not close login account.' }
  }
  return { ok: true }
}

export async function closeCurrentStorefrontAccount(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: 'Account closing is not available right now.' }
  }
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.id || !sessionUser.email) {
    return { ok: false, status: 401, error: 'Please sign in again to close your account.' }
  }

  const sb = getSupabaseAdmin()
  const result = await closeStorefrontAuthAccountKeepingOrders({
    sb,
    userId: sessionUser.id,
    email: sessionUser.email,
  })
  if (!result.ok) {
    return { ok: false, status: 400, error: result.error }
  }
  return { ok: true }
}
