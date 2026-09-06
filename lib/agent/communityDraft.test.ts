import { describe, expect, it } from 'vitest'
import {
  buildCommunityPostDraft,
  listCommunityDraftTopics,
  resolveCommunityDraftTopic,
  stripCommunitySourcesFooter,
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
    expect(draft.content).not.toMatch(/Sources:/)
    expect(draft.sources.length).toBeGreaterThan(0)
    expect(draft.autonomyNote).toMatch(/draft only/i)
    expect(draft.content).not.toMatch(/homepage hero/i)
  })

  it('keeps admin-pasted source notes in metadata only (not in publishable body)', () => {
    const draft = buildCommunityPostDraft({
      topicId: 'name_label_care',
      sourceNotes: 'https://example.edu.au/care\nInternal QA note',
    })
    expect(draft.sources).toEqual([
      'https://example.edu.au/care',
      'Internal QA note',
    ])
    expect(draft.content).not.toContain('https://example.edu.au/care')
    expect(draft.content).not.toMatch(/Sources:/)
  })

  it('Market S keeps /hot-goods CTA without a Sources footer block', () => {
    const draft = buildCommunityPostDraft({ topicId: 'market_s_event' })
    expect(draft.content).toContain('https://www.selpic.com.au/hot-goods')
    expect(draft.content).not.toMatch(/Sources:/)
    expect(draft.content).not.toMatch(/Admin-verified event dates/)
    expect(draft.sources.some((s) => /hot-goods/i.test(s))).toBe(true)
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

  it('bakes seasonal polish into the free template (no OpenAI needed)', () => {
    const draft = buildCommunityPostDraft({ topicId: 'seasonal_print_idea' })
    expect(draft.content).toContain('early-learning cubbies')
    expect(draft.content).toContain("arm's length")
    expect(draft.content).toContain('custom sticker flow')
    expect(draft.content).toMatch(/Share kindly/)
    expect(draft.content).not.toMatch(/Sources:/)
    expect(draft.content).not.toContain('merchandising notes')
    expect(draft.sources).toContain('SELPIC seasonal merchandising notes (internal)')
  })

  it('strips Sources footers from legacy queued bodies (cousin of persisted queue)', () => {
    const dirty = [
      'Seasonal colours and short phrases make everyday items feel fresh.',
      '',
      'Share kindly — this board is for helpful, respectful conversation.',
      '',
      '---',
      'Sources:',
      '• SELPIC seasonal merchandising notes (internal)',
    ].join('\n')
    expect(stripCommunitySourcesFooter(dirty)).toBe(
      [
        'Seasonal colours and short phrases make everyday items feel fresh.',
        '',
        'Share kindly — this board is for helpful, respectful conversation.',
      ].join('\n')
    )
    expect(
      stripCommunitySourcesFooter('Tip body.\n\n---\nReferences:\n- Internal note')
    ).toBe('Tip body.')
    expect(
      stripCommunitySourcesFooter(
        'Tip body.\n\nSources: Add admin-verified links or notes before publishing.'
      )
    ).toBe('Tip body.')
    // Keep in-body Market S CTA — not a Sources footer.
    expect(
      stripCommunitySourcesFooter(
        'Browse: https://www.selpic.com.au/hot-goods\n\nKeep it respectful.'
      )
    ).toContain('hot-goods')
  })
})
