import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'
import { runFundraisingRenewalNotices } from '@/lib/fundraising/runFundraisingRenewalCron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily (or external) cron: send D19 partnership renewal notices.
 * Requires `CRON_SECRET` — `Authorization: Bearer <CRON_SECRET>`.
 * Not wired in vercel.json on Hobby; use external scheduler or Admin → Partners → “Run renewal notices”.
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
