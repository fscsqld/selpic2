import { describe, expect, it } from 'vitest'
import {
  buildCommunityPostDraft,
  listCommunityDraftTopics,
  resolveCommunityDraftTopic,
} from './communityDraft'

describe('buildCommunityPostDraft', () => {
  it('lists curated topics including custom brief', () => {
    const topics = listCommunityDraftTopics()
    expect(topics.length).toBeGreaterThanOrEqual(5)
    expect(topics.some((t) => t.id === 'back_to_school_labels')).toBe(true)
    expect(topics.some((t) => t.id === 'custom_brief')).toBe(true)
  })

  it('builds a News draft for back-to-care covering school, kinder, and daycare', () => {
    const draft = buildCommunityPostDraft({ topicId: 'back_to_school_labels' })
    expect(draft.category).toBe('News')
    expect(draft.title.toLowerCase()).toMatch(/care|school/)
    expect(draft.content.toLowerCase()).toMatch(/daycare/)
    expect(draft.content.toLowerCase()).toMatch(/kinder/)
    expect(draft.content).toContain('Sources:')
    expect(draft.autonomyNote).toMatch(/draft only/i)
    expect(draft.content).not.toMatch(/homepage hero/i)
  })

  it('prefers admin-pasted source notes over defaults', () => {
    const draft = buildCommunityPostDraft({
      topicId: 'name_label_care',
      sourceNotes: 'https://example.edu.au/care\nInternal QA note',
    })
    expect(draft.sources).toEqual([
      'https://example.edu.au/care',
      'Internal QA note',
    ])
    expect(draft.content).toContain('https://example.edu.au/care')
  })

  it('blocks medical/legal/political custom briefs (cousin of unsafe publish)', () => {
    const draft = buildCommunityPostDraft({
      topicId: 'custom_brief',
      customBrief: 'Please diagnose this rash and prescribe cream before the election',
    })
    expect(draft.title.toLowerCase()).toContain('safer')
    expect(draft.content).toMatch(/medical|legal|political/i)
  })

  it('falls back safely for unknown topic ids', () => {
    const draft = buildCommunityPostDraft({ topicId: 'not_a_real_topic' })
    expect(draft.topicId).toBe('custom_brief')
    expect(draft.title.length).toBeGreaterThan(0)
    expect(resolveCommunityDraftTopic('not_a_real_topic')).toBeUndefined()
  })

  it('builds a separate Market S event draft with /hot-goods CTA (not merged into school tips)', () => {
    const topics = listCommunityDraftTopics()
    expect(topics.some((t) => t.id === 'market_s_event')).toBe(true)
    const draft = buildCommunityPostDraft({ topicId: 'market_s_event' })
    expect(draft.category).toBe('News')
    expect(draft.content).toMatch(/hot-goods/i)
    expect(draft.content.toLowerCase()).toMatch(/market s/)
    expect(draft.content).toMatch(/Do not invent discounts/i)
    expect(draft.content.toLowerCase()).not.toMatch(/back to care/)
  })
})
