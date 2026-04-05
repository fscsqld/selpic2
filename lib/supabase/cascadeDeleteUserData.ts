import type { SupabaseClient } from '@supabase/supabase-js'

function isMissingTableOrSchemaError(err: { message?: string; code?: string }): boolean {
  const m = (err.message || '').toLowerCase()
  return (
    m.includes('relation') && m.includes('does not exist') ||
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
    console.warn(`[cascadeDeleteUserData] ${table}.${column}:`, error.message)
  }
}

type OrderPayload = {
  customer?: { email?: string }
  userId?: string
}

/**
 * Removes public rows tied to a Supabase Auth user so `auth.admin.deleteUser` can succeed.
 * Best-effort for optional tables (cart_items, etc.); fails loudly on orders/profiles when configured.
 */
export async function deletePublicDataForAuthUser(
  sb: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailRaw = (userEmail || '').trim()
  const emailNorm = emailRaw.toLowerCase()

  const optionalCartTables: { table: string; column: string }[] = [
    { table: 'cart_items', column: 'user_id' },
    { table: 'cart_items', column: 'userId' },
    { table: 'user_cart', column: 'user_id' },
    { table: 'user_carts', column: 'user_id' },
    { table: 'shopping_cart_items', column: 'user_id' },
    { table: 'carts', column: 'user_id' },
  ]
  for (const { table, column } of optionalCartTables) {
    await tryDeleteWhere(sb, table, column, userId)
  }

  if (emailNorm) {
    const { data: orders, error: listErr } = await sb.from('orders').select('id, payload')
    if (listErr) {
      return { ok: false, error: `Could not list orders: ${listErr.message}` }
    }
    for (const row of orders || []) {
      const payload = row.payload as OrderPayload | null
      const ce = (payload?.customer?.email || '').trim().toLowerCase()
      const uid = payload?.userId
      if (ce === emailNorm || uid === userId) {
        const { error: delErr } = await sb.from('orders').delete().eq('id', row.id as string)
        if (delErr) {
          return { ok: false, error: `Could not delete order ${row.id}: ${delErr.message}` }
        }
      }
    }
  }

  if (emailNorm) {
    const variants = [...new Set([emailRaw, emailNorm].filter((e): e is string => Boolean(e?.trim())))]
    for (const em of variants) {
      const { error: regErr } = await sb.from('admin_email_registry').delete().eq('email', em.trim())
      if (regErr && !isMissingTableOrSchemaError(regErr)) {
        console.warn('[cascadeDeleteUserData] admin_email_registry:', regErr.message)
      }
    }
  }

  const { error: profileError } = await sb.from('profiles').delete().eq('id', userId)
  if (profileError && !isMissingTableOrSchemaError(profileError)) {
    return { ok: false, error: `Could not delete profile: ${profileError.message}` }
  }

  return { ok: true }
}
