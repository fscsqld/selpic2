import { describe, expect, it } from 'vitest'
import {
  describeAuEditorialWindow,
  suggestCommunityTopicsForDate,
} from './auCommunityCalendar'

describe('suggestCommunityTopicsForDate', () => {
  it('prioritises back-to-care labels in late January (AU Term 1)', () => {
    const list = suggestCommunityTopicsForDate(new Date(2026, 0, 25))
    expect(list[0]?.topicId).toBe('back_to_school_labels')
    expect(list[0]?.reason.toLowerCase()).toMatch(/daycare|kinder|school/)
    expect(describeAuEditorialWindow(new Date(2026, 0, 25)).toLowerCase()).toContain('term 1')
  })

  it('prioritises mid-year return in July (cousin of Jan back-to-care)', () => {
    const list = suggestCommunityTopicsForDate(new Date(2026, 6, 15))
    expect(list.some((s) => s.topicId === 'back_to_school_labels')).toBe(true)
  })

  it('surfaces Father’s Day AU seasonal idea in early September', () => {
    const list = suggestCommunityTopicsForDate(new Date(2026, 8, 3))
    expect(list[0]?.topicId).toBe('seasonal_print_idea')
    expect(list[0]?.reason.toLowerCase()).toMatch(/father/)
  })

  it('surfaces Market S in May gifting window without replacing seasonal tip #1', () => {
    const list = suggestCommunityTopicsForDate(new Date(2026, 4, 10))
    expect(list.some((s) => s.topicId === 'market_s_event')).toBe(true)
    expect(list[0]?.topicId).not.toBe('market_s_event')
  })
})
