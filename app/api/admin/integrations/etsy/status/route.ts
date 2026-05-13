import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getEtsyConnection } from '@/lib/integrations/etsy/etsyConnectionStore'

export async function GET() {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const row = await getEtsyConnection()
  if (!row) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    shopId: row.shop_id,
    shopName: row.shop_name,
    expiresAt: row.expires_at,
  })
}
