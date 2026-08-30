import { NextResponse } from 'next/server'
import {
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'
import { getEtsyConnection } from '@/lib/integrations/etsy/etsyConnectionStore'

export async function GET() {
  const gate = await requireAdminPermission('integrations:read')
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

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
