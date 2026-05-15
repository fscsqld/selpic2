import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { searchSellerTaxonomyLeaves } from '@/lib/integrations/etsy/etsyTaxonomySearch'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

/**
 * Search Etsy seller taxonomy leaves (requires `x-api-key` only on Etsy side).
 * Use query `q` to narrow (e.g. `sticker`, `name`). Empty `q` returns the first N flattened nodes (can be large).
 */
export async function GET(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const limitRaw = searchParams.get('limit')
  const limit = limitRaw ? Math.min(200, Math.max(1, Number(limitRaw) || 80)) : 80

  try {
    const nodes = await searchSellerTaxonomyLeaves({ query: q, limit })
    return NextResponse.json(
      {
        ok: true,
        query: q,
        count: nodes.length,
        nodes,
        hint:
          'Use a leaf `id` as ETSY_DEFAULT_TAXONOMY_ID. IDs are defined by Etsy and can change; always verify in Shop Manager or this search before production.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    logAndSafeMessage('etsy taxonomy GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
