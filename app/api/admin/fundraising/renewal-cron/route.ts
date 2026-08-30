import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { runFundraisingRenewalNotices } from '@/lib/fundraising/runFundraisingRenewalCron'

/**
 * Admin-triggered run of the same D19 renewal batch as the cron job.
 */
export async function POST() {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

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
