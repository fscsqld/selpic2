import { NextResponse } from 'next/server'
import { runEtsyReceiptSync } from '@/lib/integrations/etsy/runEtsyReceiptSync'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return false
  const auth = request.headers.get('authorization') || request.headers.get('Authorization')
  return auth === `Bearer ${expected}`
}

/**
 * Vercel Cron (GET every 10 minutes). Set `CRON_SECRET` in the project; Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runEtsyReceiptSync({ sinceDays: 90, openOnly: true })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logAndSafeMessage('cron etsy-sync GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
