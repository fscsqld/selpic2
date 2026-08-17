import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { runFundraisingRenewalNotices } from '@/lib/fundraising/runFundraisingRenewalCron'

/**
 * Admin-triggered run of the same D19 renewal batch as the cron job.
 */
export async function POST() {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runFundraisingRenewalNotices()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Renewal batch failed' },
      { status: 500 }
    )
  }
}
