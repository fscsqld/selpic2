import { NextResponse } from 'next/server'
import { runEtsyReceiptSync } from '@/lib/integrations/etsy/runEtsyReceiptSync'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Scheduled Etsy receipt import (GET). Requires `CRON_SECRET`; callers must send `Authorization: Bearer <CRON_SECRET>`.
 * Not wired in vercel.json on Hobby (sub-daily crons fail deploy). Use external scheduler, Vercel Pro crons, or Admin → Sync.
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(request: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not set on the server. Add it in Vercel → Environment Variables (Production).' },
      { status: 503 }
    )
  }
  if (!verifyCronBearer(request)) {
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
