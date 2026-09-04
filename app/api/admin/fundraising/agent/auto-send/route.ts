import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
} from '@/lib/fundraising/persistence'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'
import { runFundraisingOutreachDailyAutoSend } from '@/lib/fundraising/runFundraisingOutreachSend'

/** Read auto-send flag + last run (fundraising:read). */
export async function GET() {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      lastRunAt: null,
      lastResult: null,
      warning: 'Supabase not configured',
    })
  }

  try {
    const settings = await loadFundraisingSettingsFromDb()
    return NextResponse.json({
      ok: true,
      enabled: Boolean(settings.outreachAutoSendEnabled),
      lastRunAt: settings.outreachAutoSendLastRunAt || null,
      lastResult: settings.outreachAutoSendLastResult || null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load auto-send settings' },
      { status: 500 }
    )
  }
}

type Body = {
  enabled?: boolean
  runNow?: boolean
}

/** Toggle auto-send and/or run one batch now (fundraising:write). */
export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const settings = await loadFundraisingSettingsFromDb()
    let enabled = Boolean(settings.outreachAutoSendEnabled)

    if (typeof body?.enabled === 'boolean') {
      enabled = body.enabled
      const now = new Date().toISOString()
      await saveFundraisingSettingsToDb({
        ...DEFAULT_FUNDRAISING_SETTINGS,
        ...settings,
        outreachAutoSendEnabled: enabled,
        updatedAt: now,
      })
    }

    let run: Awaited<ReturnType<typeof runFundraisingOutreachDailyAutoSend>> | null = null
    if (body?.runNow) {
      run = await runFundraisingOutreachDailyAutoSend({
        ignoreEnabledGate: true,
        trigger: 'admin_run',
      })
    }

    const refreshed = await loadFundraisingSettingsFromDb()
    return NextResponse.json({
      ok: true,
      enabled: Boolean(refreshed.outreachAutoSendEnabled),
      lastRunAt: refreshed.outreachAutoSendLastRunAt || null,
      lastResult: refreshed.outreachAutoSendLastResult || null,
      run,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Auto-send update failed' },
      { status: 500 }
    )
  }
}
