import { describe, expect, it } from 'vitest'
import {
  buildNewsletterCampaignDraft,
  listNewsletterDraftTopics,
  newsletterDraftLooksLikeInternalMeta,
} from './newsletterDraft'
import {
  newsletterDraftInventedCommerce,
  parseNewsletterDraftLlmJson,
  polishNewsletterDraftWithLlm,
} from './newsletterDraftLlm'

describe('newsletterDraft', () => {
  it('lists topics without fundraising outreach wording in blurbs', () => {
    const topics = listNewsletterDraftTopics()
    expect(topics.length).toBeGreaterThan(3)
    expect(topics.every((t) => !/outreach_targets/i.test(t.blurb))).toBe(true)
  })

  it('builds a template draft without invented prices', () => {
    const draft = buildNewsletterCampaignDraft({
      topicId: 'term_start_labels',
      sourceNotes: 'AU Term 1',
    })
    expect(draft.subject.toLowerCase()).toContain('term')
    expect(draft.message).toContain('AU Term 1')
    expect(draft.message).not.toMatch(/\$\d/)
    expect(draft.autonomyNote.toLowerCase()).toContain('outreach_targets')
  })

  it('keeps selpic_n separate from school fundraising lists', () => {
    const draft = buildNewsletterCampaignDraft({ topicId: 'selpic_n_community' })
    expect(draft.message.toLowerCase()).toContain('newsletter subscribers')
    expect(draft.message.toLowerCase()).toContain('fundraising outreach')
  })
})

describe('newsletterDraftLlm', () => {
  it('parses subject/message JSON', () => {
    const parsed = parseNewsletterDraftLlmJson(
      JSON.stringify({ subject: 'Hello', message: 'Body text here' })
    )
    expect(parsed).toEqual({ subject: 'Hello', message: 'Body text here' })
  })

  it('rejects invented commerce not in grounding', () => {
    expect(newsletterDraftInventedCommerce('Save 20% off today', 'Save with your code')).toBe(
      true
    )
    expect(newsletterDraftInventedCommerce('Save 20% off today', 'Save 20% off today')).toBe(
      false
    )
  })

  it('falls back to template when LLM disabled', async () => {
    const result = await polishNewsletterDraftWithLlm(
      { topicId: 'store_announcement' },
      { env: { AGENT_NEWSLETTER_DRAFT_LLM: '0', OPENAI_API_KEY: 'sk-test' } }
    )
    expect(result.source).toBe('template')
    expect(result.subject.length).toBeGreaterThan(5)
  })

  it('detects internal meta leaks', () => {
    expect(newsletterDraftLooksLikeInternalMeta('Do not invent prices. Draft only.')).toBe(true)
  })
})
