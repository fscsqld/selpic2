import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeLedgerOrder } from '@/lib/orders/stripePaidOrder'
import type { OrderRecord } from '@/lib/store'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

/**
 * List orders from Supabase (server ledger). Requires Supabase Auth session with admin JWT claims.
 */
export async function GET(_req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ orders: [] as OrderRecord[] })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('orders')
      .select('payload,created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      logAndSafeMessage('orders GET supabase', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    const orders = (data || [])
      .map((row) => normalizeLedgerOrder(row.payload as OrderRecord))
      .filter(Boolean)

    return NextResponse.json({ orders })
  } catch (e) {
    logAndSafeMessage('orders GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
