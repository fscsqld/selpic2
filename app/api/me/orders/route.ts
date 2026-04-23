import { NextResponse } from 'next/server'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

function normEmail(s: string) {
  return (s || '').trim().toLowerCase()
}

/**
 * Customer-facing order list from the Supabase ledger (same source as admin).
 * Requires Supabase Auth session cookie; filters by session email server-side.
 */
export async function GET() {
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionEmail = normEmail(sessionUser.email)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ orders: [] as OrderRecord[] })
  }

  try {
    const sb = getSupabaseAdmin()
    const rawTrimmed = sessionUser.email.trim()
    const variants = [...new Set([sessionEmail, rawTrimmed])].filter(Boolean)

    const rowsByKey = new Map<string, { payload: unknown }>()
    for (const em of variants) {
      const { data: chunk, error } = await sb
        .from('orders')
        .select('payload, created_at')
        .filter('payload->customer->>email', 'eq', em)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        logAndSafeMessage('me/orders GET supabase', error)
        return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
      }
      for (const row of chunk || []) {
        const id = (row.payload as OrderRecord)?.id
        if (typeof id === 'string' && id) {
          rowsByKey.set(id, row as { payload: unknown })
        }
      }
    }

    const orders = Array.from(rowsByKey.values())
      .map((row) => normalizeLedgerOrder(row.payload as OrderRecord))
      .filter((o) => normEmail(o.customer?.email || '') === sessionEmail)

    return NextResponse.json({ orders })
  } catch (e) {
    logAndSafeMessage('me/orders GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
