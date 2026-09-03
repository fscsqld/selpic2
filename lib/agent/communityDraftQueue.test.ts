import { describe, expect, it } from 'vitest'
import {
  applyWeekEnqueuePlan,
  buildQueuedDraftFromTopic,
  hasPendingTopic,
  planWeekSuggestionEnqueue,
  type QueuedCommunityDraft,
} from './communityDraftQueue'

function pending(topicId: string): QueuedCommunityDraft {
  return {
    id: `id-${topicId}`,
    status: 'pending',
    topicId,
    title: 't',
    content: 'c',
    category: 'News',
    sources: [],
    createdAt: new Date().toISOString(),
    source: 'manual',
  }
}

describe('communityDraftQueue', () => {
  it('builds a queued draft from a topic without publishing', () => {
    const item = buildQueuedDraftFromTopic({ topicId: 'name_label_care', source: 'compose' })
    expect(item.status).toBe('pending')
    expect(item.topicId).toBe('name_label_care')
    expect(item.title.length).toBeGreaterThan(0)
    expect(item.source).toBe('compose')
  })

  it('detects pending topic cousins (weekly regen spam)', () => {
    expect(hasPendingTopic([pending('back_to_school_labels')], 'back_to_school_labels')).toBe(
      true
    )
    expect(hasPendingTopic([pending('name_label_care')], 'back_to_school_labels')).toBe(false)
  })

  it('plans week suggestions and skips topics already pending', () => {
    const existing = [pending('back_to_school_labels')]
    const plans = planWeekSuggestionEnqueue(existing, {
      now: new Date(2026, 0, 25),
    })
    const back = plans.find((p) => p.topicId === 'back_to_school_labels')
    expect(back?.skip).toBe(true)
    expect(plans.some((p) => !p.skip)).toBe(true)
  })

  it('force-includes market_s_event when hot goods are active', () => {
    const plans = planWeekSuggestionEnqueue([], {
      now: new Date(2026, 2, 10),
      hotGoodsActive: true,
    })
    expect(plans.some((p) => p.topicId === 'market_s_event' && !p.skip)).toBe(true)
  })

  it('applies plan by appending only non-skipped topics', () => {
    const existing = [pending('name_label_care')]
    const plans = planWeekSuggestionEnqueue(existing, {
      now: new Date(2026, 0, 25),
    })
    const { added, next } = applyWeekEnqueuePlan(existing, plans)
    expect(added.every((a) => a.source === 'week_suggestions')).toBe(true)
    expect(hasPendingTopic(next, 'name_label_care')).toBe(true)
    for (const a of added) {
      expect(next.some((n) => n.id === a.id)).toBe(true)
    }
  })
})
