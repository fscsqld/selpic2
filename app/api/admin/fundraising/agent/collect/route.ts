import { NextResponse } from 'next/server'

import { requireAdminPermission } from '@/lib/supabase/requireAdminPermission'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
} from '@/lib/fundraising/persistence'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'
import {
  assertSafeOutreachCollectFeedUrl,
  OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP,
  runFundraisingOutreachCollectFromFeed,
} from '@/lib/fundraising/outreachCollectFeed'

export async function GET() {
  const gate = await requireAdminPermission('fundraising:read')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      feedUrl: '',
      listName: '',
      licenseNote: '',
      dailyInsertCap: OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP,
      hasAuthHeader: false,
      lastRunAt: null,
      lastResult: null,
      warning: 'Supabase not configured',
    })
  }

  try {
    const s = await loadFundraisingSettingsFromDb()
    return NextResponse.json({
      ok: true,
      enabled: Boolean(s.outreachCollectEnabled),
      feedUrl: s.outreachCollectFeedUrl || '',
      listName: s.outreachCollectListName || '',
      licenseNote: s.outreachCollectLicenseNote || '',
      dailyInsertCap:
        Number(s.outreachCollectDailyInsertCap) || OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP,
      hasAuthHeader: Boolean(String(s.outreachCollectFeedAuthHeader || '').trim()),
      lastRunAt: s.outreachCollectLastRunAt || null,
      lastResult: s.outreachCollectLastResult || null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load collect settings' },
      { status: 500 }
    )
  }
}

type Body = {
  enabled?: boolean
  feedUrl?: string
  listName?: string
  licenseNote?: string
  dailyInsertCap?: number
  /** Set to empty string to clear; omit to leave unchanged. */
  authHeader?: string | null
  runNow?: boolean
}

export async function POST(req: Request) {
  const gate = await requireAdminPermission('fundraising:write')
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const settings = await loadFundraisingSettingsFromDb()
    const now = new Date().toISOString()
    let next = { ...DEFAULT_FUNDRAISING_SETTINGS, ...settings, updatedAt: now }

    if (typeof body?.enabled === 'boolean') {
      next.outreachCollectEnabled = body.enabled
    }
    if (typeof body?.feedUrl === 'string') {
      const url = body.feedUrl.trim()
      if (url) {
        const safe = assertSafeOutreachCollectFeedUrl(url)
        if (!safe.ok) return NextResponse.json({ error: safe.error }, { status: 400 })
        next.outreachCollectFeedUrl = safe.url.toString()
      } else {
        next.outreachCollectFeedUrl = ''
      }
    }
    if (typeof body?.listName === 'string') {
      next.outreachCollectListName = body.listName.trim().slice(0, 120)
    }
    if (typeof body?.licenseNote === 'string') {
      next.outreachCollectLicenseNote = body.licenseNote.trim().slice(0, 500)
    }
    if (typeof body?.dailyInsertCap === 'number' && Number.isFinite(body.dailyInsertCap)) {
      next.outreachCollectDailyInsertCap = Math.max(1, Math.min(200, Math.floor(body.dailyInsertCap)))
    }
    if (body && 'authHeader' in body) {
      const raw = body.authHeader
      if (raw == null || String(raw).trim() === '') {
        next.outreachCollectFeedAuthHeader = ''
      } else {
        next.outreachCollectFeedAuthHeader = String(raw).trim().slice(0, 500)
      }
    }

    if (
      next.outreachCollectEnabled &&
      !String(next.outreachCollectFeedUrl || '').trim()
    ) {
      return NextResponse.json(
        { error: 'Set a licensed HTTPS feed URL before enabling auto-collect.' },
        { status: 400 }
      )
    }

    await saveFundraisingSettingsToDb(next)

    let run: Awaited<ReturnType<typeof runFundraisingOutreachCollectFromFeed>> | null = null
    if (body?.runNow) {
      run = await runFundraisingOutreachCollectFromFeed({
        ignoreEnabledGate: true,
        trigger: 'admin_run',
      })
    }

    const refreshed = await loadFundraisingSettingsFromDb()
    return NextResponse.json({
      ok: true,
      enabled: Boolean(refreshed.outreachCollectEnabled),
      feedUrl: refreshed.outreachCollectFeedUrl || '',
      listName: refreshed.outreachCollectListName || '',
      licenseNote: refreshed.outreachCollectLicenseNote || '',
      dailyInsertCap:
        Number(refreshed.outreachCollectDailyInsertCap) || OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP,
      hasAuthHeader: Boolean(String(refreshed.outreachCollectFeedAuthHeader || '').trim()),
      lastRunAt: refreshed.outreachCollectLastRunAt || null,
      lastResult: refreshed.outreachCollectLastResult || null,
      run,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Collect settings update failed' },
      { status: 500 }
    )
  }
}
