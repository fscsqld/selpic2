import 'server-only'

import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'

function normEmail(s: string) {
  return (s || '').trim().toLowerCase()
}

/**
 * Storefront checkout APIs: require Supabase Auth session (UI already requires login).
 * Returns the session email to bind onto the order (form email may differ — we overwrite).
 */
export async function requireStorefrontCheckoutSession(): Promise<
  | { ok: true; email: string; userId: string }
  | { ok: false; status: 401; error: string }
> {
  const user = await getSupabaseSessionUser()
  if (!user?.email) {
    return { ok: false, status: 401, error: 'Please sign in to complete checkout.' }
  }
  return { ok: true, email: normEmail(user.email), userId: user.id }
}
