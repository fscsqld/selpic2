import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'
import { runFundraisingRenewalNotices } from '@/lib/fundraising/runFundraisingRenewalCron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily D19 partnership renewal notices.
 * Requires `CRON_SECRET` — `Authorization: Bearer <CRON_SECRET>`.
 * Wired in vercel.json as `0 20 * * *` (once daily, Hobby-legal; 20:00 UTC ≈ morning Australia).
 * Do not add Etsy 10-minute crons here — that blocked Hobby deploys. Backup: Settings → Maintenance → Run due renewals.
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
    const result = await runFundraisingRenewalNotices()
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logAndSafeMessage('cron fundraising-renewal GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
