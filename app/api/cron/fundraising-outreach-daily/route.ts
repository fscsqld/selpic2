import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'
import { runFundraisingOutreachDailyAutoSend } from '@/lib/fundraising/runFundraisingOutreachSend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily Fundraising Agent outreach auto-send (Sydney ≤10 remaining PENDING).
 * Requires `CRON_SECRET` and `outreachAutoSendEnabled` in fundraising settings (default off).
 * Hobby-safe once daily — see vercel.json. Backup: Agent → Run auto-send now.
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
    const result = await runFundraisingOutreachDailyAutoSend({ trigger: 'auto_cron' })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logAndSafeMessage('cron fundraising-outreach-daily GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
