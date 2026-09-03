/**
 * Wave 5 — pending community draft queue (HITL).
 * Drafts sit here until Approve → POST /api/admin/community/posts, or Discard.
 * No auto-publish.
 */

import { randomUUID } from 'crypto'
import {
  buildCommunityPostDraft,
} from './communityDraft'
import { suggestCommunityTopicsForDate } from './auCommunityCalendar'

export type QueuedCommunityDraftStatus = 'pending'

export type QueuedCommunityDraft = {
  id: string
  status: QueuedCommunityDraftStatus
  topicId: string
  title: string
  content: string
  category: string
  sources: string[]
  calendarWindow?: string
  createdAt: string
  createdBy?: string
  /** How the item entered the queue */
  source: 'manual' | 'week_suggestions' | 'compose'
}

export type EnqueueDraftInput = {
  topicId: string
  sourceNotes?: string
  customBrief?: string
  createdBy?: string
  source?: QueuedCommunityDraft['source']
  calendarWindow?: string
}

/** Skip enqueue when the same topicId is already pending (cousin: weekly regen spam). */
export function hasPendingTopic(
  items: QueuedCommunityDraft[],
  topicId: string
): boolean {
  return items.some((i) => i.status === 'pending' && i.topicId === topicId)
}

export function buildQueuedDraftFromTopic(
  input: EnqueueDraftInput
): QueuedCommunityDraft {
  const draft = buildCommunityPostDraft({
    topicId: input.topicId,
    sourceNotes: input.sourceNotes,
    customBrief: input.customBrief,
  })
  return {
    id: randomUUID(),
    status: 'pending',
    topicId: draft.topicId,
    title: draft.title,
    content: draft.content,
    category: draft.category,
    sources: draft.sources,
    calendarWindow: input.calendarWindow,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    source: input.source || 'manual',
  }
}

export type WeekEnqueuePlan = {
  topicId: string
  reason: string
  skip: boolean
  skipReason?: string
}

/**
 * Plan which calendar suggestions to enqueue.
 * - Dedupe pending topicIds
 * - Optionally force-include market_s_event when hot goods are active
 */
export function planWeekSuggestionEnqueue(
  existing: QueuedCommunityDraft[],
  opts?: {
    now?: Date
    forceMarketS?: boolean
    hotGoodsActive?: boolean
    limit?: number
  }
): WeekEnqueuePlan[] {
  const now = opts?.now ?? new Date()
  const limit = opts?.limit ?? 4
  const suggestions = suggestCommunityTopicsForDate(now)
  const plans: WeekEnqueuePlan[] = []

  for (const s of suggestions.slice(0, limit)) {
    if (hasPendingTopic(existing, s.topicId) || plans.some((p) => p.topicId === s.topicId)) {
      plans.push({
        topicId: s.topicId,
        reason: s.reason,
        skip: true,
        skipReason: 'Already pending for this topic',
      })
      continue
    }
    plans.push({ topicId: s.topicId, reason: s.reason, skip: false })
  }

  const wantMarketS = Boolean(opts?.forceMarketS || opts?.hotGoodsActive)
  if (
    wantMarketS &&
    !hasPendingTopic(existing, 'market_s_event') &&
    !plans.some((p) => p.topicId === 'market_s_event' && !p.skip)
  ) {
    // Replace last non-forced slot or append if under limit
    const activeCount = plans.filter((p) => !p.skip).length
    if (activeCount >= limit) {
      const lastIdx = [...plans].reverse().findIndex((p) => !p.skip)
      if (lastIdx >= 0) {
        const idx = plans.length - 1 - lastIdx
        plans[idx] = {
          topicId: 'market_s_event',
          reason: 'Market S / Hot Goods appears active — include event draft for Approve.',
          skip: false,
        }
      }
    } else {
      plans.push({
        topicId: 'market_s_event',
        reason: 'Market S / Hot Goods appears active — include event draft for Approve.',
        skip: false,
      })
    }
  }

  return plans
}

export function applyWeekEnqueuePlan(
  existing: QueuedCommunityDraft[],
  plans: WeekEnqueuePlan[],
  meta?: { createdBy?: string; calendarWindow?: string }
): { next: QueuedCommunityDraft[]; added: QueuedCommunityDraft[]; skipped: WeekEnqueuePlan[] } {
  const next = [...existing]
  const added: QueuedCommunityDraft[] = []
  const skipped: WeekEnqueuePlan[] = []

  for (const plan of plans) {
    if (plan.skip) {
      skipped.push(plan)
      continue
    }
    if (hasPendingTopic(next, plan.topicId)) {
      skipped.push({ ...plan, skip: true, skipReason: 'Already pending for this topic' })
      continue
    }
    const item = buildQueuedDraftFromTopic({
      topicId: plan.topicId,
      createdBy: meta?.createdBy,
      calendarWindow: meta?.calendarWindow,
      source: 'week_suggestions',
    })
    next.unshift(item)
    added.push(item)
  }

  return { next, added, skipped }
}
