/**
 * Fundraising Agent — daily outreach queue (Step 2).
 * Sydney calendar day cap + PENDING pool picker. HITL Confirm Send reuses send API.
 */

import type { FundraisingOutreachTarget } from './types'
import {
  isInstantOnSydneyCalendarDay,
  sydneyCalendarDateKey,
} from './auFinancialQuarter'

/** Hard daily send cap (Australia/Sydney). Matches per-request send max. */
export const OUTREACH_DAILY_SEND_CAP = 10

export type OutreachDailyQuota = {
  dayKey: string
  dailyCap: number
  sentToday: number
  remaining: number
}

export function countOutreachSentOnSydneyDay(
  targets: Array<Pick<FundraisingOutreachTarget, 'lastSentAt'>>,
  now = new Date()
): number {
  const dayKey = sydneyCalendarDateKey(now)
  let n = 0
  for (const t of targets) {
    if (t.lastSentAt && isInstantOnSydneyCalendarDay(t.lastSentAt, dayKey)) n++
  }
  return n
}

export function buildOutreachDailyQuota(
  targets: Array<Pick<FundraisingOutreachTarget, 'lastSentAt'>>,
  now = new Date(),
  dailyCap = OUTREACH_DAILY_SEND_CAP
): OutreachDailyQuota {
  const dayKey = sydneyCalendarDateKey(now)
  const sentToday = countOutreachSentOnSydneyDay(targets, now)
  const remaining = Math.max(0, dailyCap - sentToday)
  return { dayKey, dailyCap, sentToday, remaining }
}

export function isOutreachDailyQueueCandidate(
  t: Pick<FundraisingOutreachTarget, 'status' | 'contactEmail'>
): boolean {
  if (t.status !== 'PENDING') return false
  const email = String(t.contactEmail || '')
    .trim()
    .toLowerCase()
  return Boolean(email && email.includes('@') && email.split('@')[1]?.includes('.'))
}

/**
 * Oldest PENDING-with-email first, capped by remaining daily slots.
 * Does not include CONTACTED / FAILED / OPTED_OUT / CONVERTED.
 */
export function pickOutreachDailyQueue(
  targets: FundraisingOutreachTarget[],
  remainingSlots: number
): FundraisingOutreachTarget[] {
  const slots = Math.max(0, Math.floor(remainingSlots))
  if (slots === 0) return []
  return [...targets]
    .filter(isOutreachDailyQueueCandidate)
    .sort((a, b) => {
      const ac = Date.parse(a.createdAt || '') || 0
      const bc = Date.parse(b.createdAt || '') || 0
      if (ac !== bc) return ac - bc
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(0, slots)
}

export function assertBatchFitsDailyQuota(opts: {
  batchSize: number
  remaining: number
  dailyCap?: number
}): { ok: true } | { ok: false; error: string } {
  const cap = opts.dailyCap ?? OUTREACH_DAILY_SEND_CAP
  const size = Math.max(0, Math.floor(opts.batchSize))
  const remaining = Math.max(0, Math.floor(opts.remaining))
  if (size === 0) {
    return { ok: false, error: 'Select at least one target.' }
  }
  if (remaining <= 0) {
    return {
      ok: false,
      error: `Daily outreach cap reached (${cap} per Sydney day). Try again tomorrow.`,
    }
  }
  if (size > remaining) {
    return {
      ok: false,
      error: `Only ${remaining} send slot(s) left today (cap ${cap} / Sydney day). Deselect ${size - remaining} target(s).`,
    }
  }
  return { ok: true }
}
