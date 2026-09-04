import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { listFundraisingOutreachTargetsFromDb } from '@/lib/fundraising/persistence'
import {
  buildOutreachDailyQuota,
  isOutreachDailyQueueCandidate,
  pickOutreachDailyQueue,
} from '@/lib/fundraising/outreachDailyQueue'

export async function GET() {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      warning: 'Supabase not configured',
      dayKey: null,
      dailyCap: 10,
      sentToday: 0,
      remaining: 0,
      pendingPoolSize: 0,
      suggested: [],
    })
  }

  try {
    const targets = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
    const quota = buildOutreachDailyQuota(targets)
    const suggested = pickOutreachDailyQueue(targets, quota.remaining)
    const pendingPoolSize = targets.filter(isOutreachDailyQueueCandidate).length

    return NextResponse.json({
      ok: true,
      ...quota,
      pendingPoolSize,
      suggested,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to build daily queue' },
      { status: 500 }
    )
  }
}
