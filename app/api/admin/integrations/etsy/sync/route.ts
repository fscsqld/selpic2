import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { runEtsyReceiptSync } from '@/lib/integrations/etsy/runEtsyReceiptSync'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

/**
 * Import Etsy receipts into `orders`.
 * Default: paid + not yet shipped ("open" for fulfillment). Set `openOnly: false` to include shipped receipts.
 */
export async function POST(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sinceDays = 90
  let openOnly = true
  try {
    const body = (await request.json().catch(() => ({}))) as { sinceDays?: number; openOnly?: boolean }
    if (typeof body.sinceDays === 'number' && body.sinceDays > 0 && body.sinceDays <= 180) {
      sinceDays = body.sinceDays
    }
    if (typeof body.openOnly === 'boolean') {
      openOnly = body.openOnly
    }
  } catch {
    /* defaults */
  }

  try {
    const result = await runEtsyReceiptSync({ sinceDays, openOnly })
    if (result.skipped) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Etsy is not connected. Connect from Admin → Integrations.',
          imported: 0,
          scanned: 0,
          sinceDays: result.sinceDays,
          openOnly: result.openOnly,
        },
        { status: 422 }
      )
    }
    return NextResponse.json({
      ok: true,
      imported: result.imported,
      scanned: result.scanned,
      sinceDays: result.sinceDays,
      openOnly: result.openOnly,
    })
  } catch (e) {
    logAndSafeMessage('etsy sync POST', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
