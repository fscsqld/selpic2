import { NextResponse } from 'next/server'

import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { aggregateLikeCounts, sortLikeSummary } from '@/lib/productLikes'
import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Admin: top liked products for stock / buy planning.
 * GET /api/admin/products/likes-summary?limit=20
 */
export async function GET(req: Request) {
  const gate = await requireAdminPermission('products:read')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], available: false })
  }

  const { searchParams } = new URL(req.url)
  const limitRaw = Number(searchParams.get('limit') || 20)
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('product_likes').select('product_id')
    if (error) throw error

    const items = sortLikeSummary(aggregateLikeCounts(data)).slice(0, limit)
    return NextResponse.json({ items, available: true })
  } catch (e) {
    logAndSafeMessage('admin/products/likes-summary GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
