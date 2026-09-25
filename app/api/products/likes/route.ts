import { NextResponse } from 'next/server'

import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { aggregateLikeCounts, parseProductLikeIdsQuery } from '@/lib/productLikes'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

/**
 * Batch like counts for listing cards.
 * GET /api/products/likes?ids=id1,id2,...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ids = parseProductLikeIdsQuery(searchParams.get('ids'))

  if (ids.length === 0) {
    return NextResponse.json({ counts: {} as Record<string, number>, available: false })
  }

  if (!isSupabaseConfigured()) {
    const empty: Record<string, number> = {}
    for (const id of ids) empty[id] = 0
    return NextResponse.json({ counts: empty, available: false })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('product_likes')
      .select('product_id')
      .in('product_id', ids)

    if (error) throw error

    const map = aggregateLikeCounts(data)
    const counts: Record<string, number> = {}
    for (const id of ids) {
      counts[id] = map.get(id) || 0
    }
    return NextResponse.json({ counts, available: true })
  } catch (e) {
    logAndSafeMessage('products/likes GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
