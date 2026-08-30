import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import type { OrderRecord } from '@/lib/store'
import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { hydrateLedgerOrder } from '@/lib/orders/ledgerOrderHydrate'

/**
 * List orders from Supabase (server ledger). Requires Supabase Auth session with admin JWT claims.
 */
export async function GET(_req: Request) {
  const gate = await requireAdminPermission('orders:read')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ orders: [] as OrderRecord[] })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('orders')
      .select('payload,created_at,platform_source,external_order_key')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      logAndSafeMessage('orders GET supabase', error)
      return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
    }

    const orders = (data || [])
      .map((row) => hydrateLedgerOrder(row as Parameters<typeof hydrateLedgerOrder>[0]))
      .filter(Boolean)

    return NextResponse.json({ orders })
  } catch (e) {
    logAndSafeMessage('orders GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
