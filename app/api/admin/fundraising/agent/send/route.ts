import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { sendFundraisingOutreachBatch } from '@/lib/fundraising/runFundraisingOutreachSend'

type SendBody = {
  targetIds?: string[]
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as SendBody | null
    const ids = Array.isArray(body?.targetIds) ? body!.targetIds : []
    const result = await sendFundraisingOutreachBatch(ids, { trigger: 'manual' })
    if (result.error && result.results.length === 0 && result.sent === 0) {
      return NextResponse.json(
        {
          error: result.error,
          dayKey: result.dayKey,
          sentToday: result.sentToday,
          remaining: result.remaining,
          dailyCap: result.dailyCap,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Send failed' },
      { status: 500 }
    )
  }
}
