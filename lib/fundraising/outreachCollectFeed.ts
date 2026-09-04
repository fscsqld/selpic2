/**
 * Fundraising Agent — auto-collect from a licensed HTTPS CSV/JSON feed (no web scrape).
 * Ops points this at a purchased/official export URL they are licensed to use for outreach.
 */

import {
  assignInsertIds,
  buildTargetFromImportRow,
  parseOutreachTargetImportText,
  planOutreachTargetImport,
} from './outreachTargetImport'
import type { OutreachListSourceMeta } from './outreachListSource'
import {
  listFundraisingOutreachTargetsFromDb,
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
  upsertFundraisingOutreachTarget,
} from './persistence'
import { DEFAULT_FUNDRAISING_SETTINGS } from './types'
import type { FundraisingOutreachTarget } from './types'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  isInstantOnSydneyCalendarDay,
  sydneyCalendarDateKey,
} from './auFinancialQuarter'
import { assertSafeOutreachCollectFeedUrl } from './outreachCollectFeedUrl'

export { assertSafeOutreachCollectFeedUrl } from './outreachCollectFeedUrl'

/** Max bytes for a remote feed body. */
export const OUTREACH_COLLECT_MAX_BYTES = 2_000_000

/** Default max NEW inserts per Sydney day from auto-collect (send cap stays ≤10). */
export const OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP = 50

export type OutreachCollectResult = {
  ok: boolean
  ran: boolean
  enabled: boolean
  reason?: string
  error?: string
  dayKey: string
  parsed: number
  inserted: number
  updated: number
  skipped: number
  saved: number
  truncatedFeed: boolean
  feedHost?: string
}

export async function fetchOutreachCollectFeedText(opts: {
  feedUrl: string
  authHeader?: string
}): Promise<{ ok: true; text: string; host: string } | { ok: false; error: string }> {
  const safe = assertSafeOutreachCollectFeedUrl(opts.feedUrl)
  if (!safe.ok) return safe

  const headers: Record<string, string> = {
    Accept: 'text/csv,application/json,text/plain,*/*',
    'User-Agent': 'SELPIC-FundraisingAgentCollect/1.0',
  }
  const auth = String(opts.authHeader || '').trim()
  if (auth) {
    // Allow "Bearer xxx" or raw token → Bearer
    headers.Authorization = /^bearer\s+/i.test(auth) ? auth : `Bearer ${auth}`
  }

  let res: Response
  try {
    res = await fetch(safe.url.toString(), {
      method: 'GET',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Feed fetch failed' }
  }

  if (!res.ok) {
    return { ok: false, error: `Feed HTTP ${res.status}` }
  }

  const buf = await res.arrayBuffer()
  if (buf.byteLength > OUTREACH_COLLECT_MAX_BYTES) {
    return {
      ok: false,
      error: `Feed larger than ${OUTREACH_COLLECT_MAX_BYTES} bytes — split the licensed export.`,
    }
  }
  const text = new TextDecoder('utf-8').decode(buf)
  return { ok: true, text, host: safe.url.hostname }
}

function countInsertsToday(
  targets: FundraisingOutreachTarget[],
  dayKey: string
): number {
  let n = 0
  for (const t of targets) {
    const importedAt = String(t.payload?.importedAt || '')
    const source = String(t.payload?.importSource || '')
    if (source !== 'licensed_list_upload' && source !== 'official_directory_export') continue
    if (!importedAt) continue
    if (isInstantOnSydneyCalendarDay(importedAt, dayKey)) n++
  }
  return n
}

/**
 * Pull licensed feed → plan/import into outreach_targets (PENDING upsert rules).
 * Caps how many *new* rows can be inserted per Sydney day.
 */
export async function runFundraisingOutreachCollectFromFeed(opts?: {
  ignoreEnabledGate?: boolean
  trigger?: 'auto_cron' | 'admin_run'
}): Promise<OutreachCollectResult> {
  const dayKey = sydneyCalendarDateKey()
  const base: OutreachCollectResult = {
    ok: true,
    ran: false,
    enabled: false,
    dayKey,
    parsed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    saved: 0,
    truncatedFeed: false,
  }

  if (!isSupabaseConfigured()) {
    return { ...base, ok: false, error: 'Supabase not configured', reason: 'Supabase not configured' }
  }

  const settings = await loadFundraisingSettingsFromDb()
  const enabled = Boolean(settings.outreachCollectEnabled)
  base.enabled = enabled

  if (!enabled && !opts?.ignoreEnabledGate) {
    return {
      ...base,
      reason: 'outreachCollectEnabled is false — set feed URL and enable collect on Agent',
    }
  }

  const feedUrl = String(settings.outreachCollectFeedUrl || '').trim()
  if (!feedUrl) {
    return { ...base, ok: false, error: 'Collect feed URL is not configured.', reason: 'Missing feed URL' }
  }

  const fetched = await fetchOutreachCollectFeedText({
    feedUrl,
    authHeader: settings.outreachCollectFeedAuthHeader,
  })
  if (!fetched.ok) {
    await persistCollectRun(settings, {
      at: new Date().toISOString(),
      summary: `Collect failed · ${fetched.error}`,
    })
    return { ...base, ok: false, error: fetched.error, reason: fetched.error, feedHost: undefined }
  }

  const parsed = parseOutreachTargetImportText(fetched.text)
  if (parsed.rows.length === 0) {
    const msg = parsed.parseErrors[0] || 'Feed had no importable rows.'
    await persistCollectRun(settings, {
      at: new Date().toISOString(),
      summary: `Collect skipped · ${msg}`,
    })
    return {
      ...base,
      ok: false,
      error: msg,
      reason: msg,
      feedHost: fetched.host,
      truncatedFeed: parsed.truncated,
    }
  }

  const existingTargets = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
  const existingByEmail = new Map<string, FundraisingOutreachTarget>()
  for (const t of existingTargets) {
    const email = String(t.contactEmail || '')
      .trim()
      .toLowerCase()
    if (!email) continue
    if (!existingByEmail.has(email)) existingByEmail.set(email, t)
  }

  const plan = planOutreachTargetImport(parsed.rows, existingByEmail)
  const insertCap =
    Math.max(
      1,
      Math.min(
        200,
        Number(settings.outreachCollectDailyInsertCap) || OUTREACH_COLLECT_DEFAULT_DAILY_INSERT_CAP
      )
    )
  const alreadyInsertedToday = countInsertsToday(existingTargets, dayKey)
  let insertBudget = Math.max(0, insertCap - alreadyInsertedToday)

  const source: OutreachListSourceMeta = {
    importSource: 'licensed_list_upload',
    listName: String(settings.outreachCollectListName || fetched.host || 'Licensed feed').slice(0, 120),
    licenseNote: String(settings.outreachCollectLicenseNote || `auto-collect ${opts?.trigger || 'run'}`).slice(
      0,
      500
    ),
  }

  const insertIds = assignInsertIds(plan, existingTargets.map((t) => t.id))
  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let skipped = plan.skipped
  let saved = 0
  const errors: string[] = []

  for (let i = 0; i < plan.decisions.length; i++) {
    const d = plan.decisions[i]
    if (d.action === 'skip') continue

    if (d.action === 'insert') {
      if (insertBudget <= 0) {
        skipped++
        continue
      }
      const id = insertIds.get(i)
      if (!id) {
        errors.push(`Missing id for ${d.row.organizationName}`)
        continue
      }
      const target = buildTargetFromImportRow({ row: d.row, id, nowIso: now, source })
      const res = await upsertFundraisingOutreachTarget(target)
      if (!res.ok) {
        errors.push(`${d.row.organizationName}: ${res.error}`)
        continue
      }
      inserted++
      saved++
      insertBudget--
      existingByEmail.set(d.normalizedEmail, target)
      continue
    }

    if (d.action === 'update') {
      const target = buildTargetFromImportRow({
        row: d.row,
        id: d.existingId,
        existing: d.existing,
        nowIso: now,
        source,
      })
      const res = await upsertFundraisingOutreachTarget(target)
      if (!res.ok) {
        errors.push(`${d.row.organizationName}: ${res.error}`)
        continue
      }
      updated++
      saved++
      existingByEmail.set(d.normalizedEmail, target)
    }
  }

  const summary = `Collect · host ${fetched.host} · parsed ${parsed.rows.length}, insert ${inserted}, update ${updated}, skip ${skipped}, saved ${saved}${errors.length ? `, errors ${errors.length}` : ''} · budget left ${insertBudget}`
  await persistCollectRun(settings, { at: now, summary })

  return {
    ok: errors.length === 0,
    ran: true,
    enabled,
    dayKey,
    parsed: parsed.rows.length,
    inserted,
    updated,
    skipped,
    saved,
    truncatedFeed: parsed.truncated,
    feedHost: fetched.host,
    error: errors.length ? errors.slice(0, 3).join('; ') : undefined,
    reason: summary,
  }
}

async function persistCollectRun(
  settings: Awaited<ReturnType<typeof loadFundraisingSettingsFromDb>>,
  run: { at: string; summary: string }
) {
  try {
    await saveFundraisingSettingsToDb({
      ...DEFAULT_FUNDRAISING_SETTINGS,
      ...settings,
      outreachCollectLastRunAt: run.at,
      outreachCollectLastResult: run.summary.slice(0, 400),
      updatedAt: run.at,
    })
  } catch {
    /* non-blocking */
  }
}
