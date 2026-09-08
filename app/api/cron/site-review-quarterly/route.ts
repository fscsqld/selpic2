import { NextResponse } from 'next/server'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'
import { isCronSecretConfigured, verifyCronBearer } from '@/lib/env/cronSecret'
import { runQuarterlySiteReviewCron } from '@/lib/agent/siteReview/runQuarterlySiteReview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily Site Review gate (Hobby-safe). Runs the real review only on AU FY
 * quarter-start window (Sydney Jul/Oct/Jan/Apr day 1–2). Schedule: 22:00 UTC
 * — after fundraising 19–21 UTC slots.
 *
 * Optional: `?force=1` with CRON_SECRET to run outside the window (ops/test).
 * Kill-switches: SITE_REVIEW_CRON_ENABLED=0 · SITE_REVIEW_CRON_EMAIL=0
 */
export async function GET(request: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json(
      {
        error:
          'CRON_SECRET is not set on the server. Add it in Vercel → Environment Variables (Production).',
      },
      { status: 503 }
    )
  }
  if (!verifyCronBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === '1'
    const result = await runQuarterlySiteReviewCron({ force })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logAndSafeMessage('cron site-review-quarterly GET', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
