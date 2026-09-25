import { NextResponse } from 'next/server'

import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { normalizeProductLikeId } from '@/lib/productLikes'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { getSupabaseSessionUser } from '@/lib/supabase/requireSupabaseAdmin'

/**
 * Logged-in customer: product ids they liked (newest first).
 * GET /api/products/likes/mine
 */
export async function GET() {
  const sessionUser = await getSupabaseSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ productIds: [] as string[], available: false })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('product_likes')
      .select('product_id, created_at')
      .eq('user_id', sessionUser.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const productIds: string[] = []
    const seen = new Set<string>()
    for (const row of data || []) {
      const id = normalizeProductLikeId(row.product_id)
      if (!id || seen.has(id)) continue
      seen.add(id)
      productIds.push(id)
    }

    return NextResponse.json({ productIds, available: true })
  } catch (e) {
    logAndSafeMessage('products/likes/mine GET', e)
    return NextResponse.json({ error: SAFE_API_ERROR_MESSAGE }, { status: 500 })
  }
}
