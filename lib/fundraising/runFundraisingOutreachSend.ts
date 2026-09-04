/**
 * Shared Fundraising Agent outreach send (HITL Confirm Send + daily auto-send cron).
 */

import {
  ensureFundraisingOutreachUnsubscribeToken,
  getFundraisingOutreachTargetById,
  listFundraisingOutreachTargetsFromDb,
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
  upsertFundraisingOutreachTarget,
} from '@/lib/fundraising/persistence'
import {
  buildFundraisingOutreachApplyUrl,
  buildFundraisingOutreachEmail,
  buildFundraisingOutreachUnsubscribeApiUrl,
  buildFundraisingOutreachUnsubscribeUrl,
} from '@/lib/fundraising/outreachEmail'
import {
  assertBatchFitsDailyQuota,
  buildOutreachDailyQuota,
  OUTREACH_DAILY_SEND_CAP,
  pickOutreachDailyQueue,
} from '@/lib/fundraising/outreachDailyQueue'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import type { FundraisingOutreachTarget } from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'

export type OutreachSendResultRow = {
  id: string
  ok: boolean
  skipped?: boolean
  reason?: string
  status?: string
}

export type OutreachSendBatchResult = {
  ok: boolean
  sent: number
  failed: number
  skipped: number
  maxPerRequest: number
  dayKey: string
  sentToday: number
  remaining: number
  dailyCap: number
  results: OutreachSendResultRow[]
  error?: string
}

export async function sendFundraisingOutreachBatch(
  targetIds: string[],
  opts?: { trigger?: 'manual' | 'auto_cron' | 'admin_run' }
): Promise<OutreachSendBatchResult> {
  const trigger = opts?.trigger || 'manual'
  const ids = Array.from(
    new Set(
      (targetIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  )

  if (!isSupabaseConfigured()) {
    return emptyFail('Supabase not configured')
  }
  if (ids.length === 0) {
    return emptyFail('Select at least one target.')
  }
  if (ids.length > OUTREACH_DAILY_SEND_CAP) {
    return emptyFail(
      `Select at most ${OUTREACH_DAILY_SEND_CAP} targets per send (v1 safety cap).`
    )
  }

  const existingForQuota = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
  const quota = buildOutreachDailyQuota(existingForQuota)
  const fit = assertBatchFitsDailyQuota({
    batchSize: ids.length,
    remaining: quota.remaining,
    dailyCap: quota.dailyCap,
  })
  if (!fit.ok) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      maxPerRequest: OUTREACH_DAILY_SEND_CAP,
      dayKey: quota.dayKey,
      sentToday: quota.sentToday,
      remaining: quota.remaining,
      dailyCap: quota.dailyCap,
      results: [],
      error: fit.error,
    }
  }

  const results: OutreachSendResultRow[] = []
  let sentThisRequest = 0

  for (const id of ids) {
    if (sentThisRequest >= quota.remaining) {
      results.push({
        id,
        ok: true,
        skipped: true,
        reason: 'Daily outreach cap reached',
      })
      continue
    }

    let target = await getFundraisingOutreachTargetById(id)
    if (!target) {
      results.push({ id, ok: false, reason: 'Target not found' })
      continue
    }
    if (target.status === 'OPTED_OUT') {
      results.push({ id, ok: true, skipped: true, reason: 'Opted out', status: target.status })
      continue
    }
    if (target.status === 'CONVERTED') {
      results.push({
        id,
        ok: true,
        skipped: true,
        reason: 'Already converted',
        status: target.status,
      })
      continue
    }
    const email = String(target.contactEmail || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      results.push({ id, ok: false, reason: 'Missing contact email', status: target.status })
      continue
    }

    const ensured = await ensureFundraisingOutreachUnsubscribeToken(target)
    if (!ensured.ok) {
      results.push({ id, ok: false, reason: ensured.error, status: target.status })
      continue
    }
    target = ensured.target

    const applyUrl = buildFundraisingOutreachApplyUrl(target.id)
    const unsubscribeUrl = buildFundraisingOutreachUnsubscribeUrl(ensured.token)
    const listUnsubscribeUrl = buildFundraisingOutreachUnsubscribeApiUrl(ensured.token)
    const rendered = buildFundraisingOutreachEmail({
      target,
      applyUrl,
      unsubscribeUrl,
      listUnsubscribeUrl,
    })

    const sent = await sendEmailViaResendServer({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: rendered.headers,
      replyTo: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
      skipBranding: true,
      skipTracking: true,
    })

    const now = new Date().toISOString()
    if (!sent.ok) {
      const failed: FundraisingOutreachTarget = {
        ...target,
        status: 'FAILED',
        lastError: sent.logMessage,
        updatedAt: now,
      }
      await upsertFundraisingOutreachTarget(failed)
      results.push({ id, ok: false, reason: sent.logMessage, status: 'FAILED' })
      continue
    }

    const contacted: FundraisingOutreachTarget = {
      ...target,
      status: 'CONTACTED',
      lastSentAt: now,
      lastError: undefined,
      updatedAt: now,
      payload: {
        ...(target.payload || {}),
        lastTemplateSubject: rendered.subject,
        dailyQueueDayKey: quota.dayKey,
        sendTrigger: trigger,
      },
    }
    await upsertFundraisingOutreachTarget(contacted)
    results.push({ id, ok: true, status: 'CONTACTED' })
    sentThisRequest++
  }

  const sentCount = results.filter((r) => r.ok && !r.skipped).length
  const failed = results.filter((r) => !r.ok).length
  const skipped = results.filter((r) => r.skipped).length
  const quotaAfter = buildOutreachDailyQuota(existingForQuota)
  const sentTodayAfter = quotaAfter.sentToday + sentCount

  return {
    ok: failed === 0,
    sent: sentCount,
    failed,
    skipped,
    maxPerRequest: OUTREACH_DAILY_SEND_CAP,
    dayKey: quota.dayKey,
    sentToday: sentTodayAfter,
    remaining: Math.max(0, quota.dailyCap - sentTodayAfter),
    dailyCap: quota.dailyCap,
    results,
  }
}

function emptyFail(error: string): OutreachSendBatchResult {
  return {
    ok: false,
    sent: 0,
    failed: 0,
    skipped: 0,
    maxPerRequest: OUTREACH_DAILY_SEND_CAP,
    dayKey: '',
    sentToday: 0,
    remaining: 0,
    dailyCap: OUTREACH_DAILY_SEND_CAP,
    results: [],
    error,
  }
}

export type OutreachDailyAutoSendResult = OutreachSendBatchResult & {
  enabled: boolean
  ran: boolean
  reason?: string
  pickedIds: string[]
}

/**
 * Sydney daily auto-send: picks oldest PENDING up to remaining slots.
 * No-op unless `outreachAutoSendEnabled` is true in fundraising settings.
 */
export async function runFundraisingOutreachDailyAutoSend(opts?: {
  ignoreEnabledGate?: boolean
  trigger?: 'auto_cron' | 'admin_run'
}): Promise<OutreachDailyAutoSendResult> {
  const trigger = opts?.trigger || 'auto_cron'
  if (!isSupabaseConfigured()) {
    return {
      ...emptyFail('Supabase not configured'),
      enabled: false,
      ran: false,
      reason: 'Supabase not configured',
      pickedIds: [],
    }
  }

  const settings = await loadFundraisingSettingsFromDb()
  const enabled = Boolean(settings.outreachAutoSendEnabled)
  if (!enabled && !opts?.ignoreEnabledGate) {
    return {
      ...emptyFail('Auto-send is disabled'),
      enabled: false,
      ran: false,
      reason: 'outreachAutoSendEnabled is false — turn on from Fundraising Agent',
      pickedIds: [],
      ok: true,
      error: undefined,
    }
  }

  const targets = await listFundraisingOutreachTargetsFromDb({ limit: 2000 })
  const quota = buildOutreachDailyQuota(targets)
  if (quota.remaining <= 0) {
    const now = new Date().toISOString()
    await persistAutoSendRun(settings, {
      at: now,
      summary: `Skipped · daily cap full (${quota.sentToday}/${quota.dailyCap}) · ${quota.dayKey}`,
    })
    return {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      maxPerRequest: OUTREACH_DAILY_SEND_CAP,
      dayKey: quota.dayKey,
      sentToday: quota.sentToday,
      remaining: 0,
      dailyCap: quota.dailyCap,
      results: [],
      enabled,
      ran: false,
      reason: 'Daily outreach cap already reached',
      pickedIds: [],
    }
  }

  const picked = pickOutreachDailyQueue(targets, quota.remaining)
  const pickedIds = picked.map((t) => t.id)
  if (pickedIds.length === 0) {
    const now = new Date().toISOString()
    await persistAutoSendRun(settings, {
      at: now,
      summary: `Skipped · no PENDING pool · ${quota.dayKey}`,
    })
    return {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      maxPerRequest: OUTREACH_DAILY_SEND_CAP,
      dayKey: quota.dayKey,
      sentToday: quota.sentToday,
      remaining: quota.remaining,
      dailyCap: quota.dailyCap,
      results: [],
      enabled,
      ran: false,
      reason: 'No PENDING targets with email',
      pickedIds: [],
    }
  }

  const batch = await sendFundraisingOutreachBatch(pickedIds, { trigger })
  const now = new Date().toISOString()
  await persistAutoSendRun(settings, {
    at: now,
    summary: `Sent ${batch.sent}, failed ${batch.failed}, skipped ${batch.skipped} · ${batch.dayKey} · ${trigger}`,
  })

  return {
    ...batch,
    enabled,
    ran: true,
    pickedIds,
  }
}

async function persistAutoSendRun(
  settings: Awaited<ReturnType<typeof loadFundraisingSettingsFromDb>>,
  run: { at: string; summary: string }
) {
  try {
    await saveFundraisingSettingsToDb({
      ...DEFAULT_FUNDRAISING_SETTINGS,
      ...settings,
      outreachAutoSendLastRunAt: run.at,
      outreachAutoSendLastResult: run.summary.slice(0, 400),
      updatedAt: run.at,
    })
  } catch {
    /* non-blocking */
  }
}
