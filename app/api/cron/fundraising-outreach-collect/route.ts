import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'
import { runFundraisingOutreachCollectFromFeed } from '@/lib/fundraising/outreachCollectFeed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily licensed-feed collect → PENDING outreach targets.
 * Requires CRON_SECRET + outreachCollectEnabled + https feed URL.
 * Hobby-safe once daily. Runs before outreach auto-send (19:00 UTC).
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
    const result = await runFundraisingOutreachCollectFromFeed({ trigger: 'auto_cron' })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logAndSafeMessage('cron fundraising-outreach-collect GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
