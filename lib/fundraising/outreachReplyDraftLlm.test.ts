import { describe, expect, it, vi } from 'vitest'
import { buildOutreachFollowUpDraft } from './outreachReplyDraft'
import {
  isFundraisingDraftLlmEnabled,
  outreachLlmDroppedApplyUrl,
  outreachLlmDroppedGreeting,
  outreachLlmInventedBrandingContact,
  outreachLlmInventedPercent,
  outreachLlmTrivialChange,
  parseOutreachLlmJson,
  polishOutreachFollowUpDraftWithLlm,
} from './outreachReplyDraftLlm'

describe('outreachReplyDraftLlm', () => {
  it('respects global and sector kill switches', () => {
    expect(
      isFundraisingDraftLlmEnabled({ OPENAI_API_KEY: 'sk-x' })
    ).toBe(true)
    expect(
      isFundraisingDraftLlmEnabled({
        OPENAI_API_KEY: 'sk-x',
        AGENT_DRAFT_LLM: '0',
      })
    ).toBe(false)
    expect(
      isFundraisingDraftLlmEnabled({
        OPENAI_API_KEY: 'sk-x',
        AGENT_FUNDRAISING_DRAFT_LLM: '0',
      })
    ).toBe(false)
  })

  it('parses subject/text JSON (body alias allowed)', () => {
    expect(
      parseOutreachLlmJson(
        '{"subject":"Re: hello","text":"Hi,\\n\\nThanks.\\n\\nKind regards,\\nSELPIC Fundraising"}'
      )
    ).toMatchObject({ subject: 'Re: hello' })
    expect(
      parseOutreachLlmJson(
        '{"subject":"Re: hello","body":"Hi,\\n\\nThanks.\\n\\nKind regards,\\nSELPIC Fundraising"}'
      )?.text
    ).toContain('Kind regards')
    expect(parseOutreachLlmJson('{"subject":"x","text":"no signoff"}')).toBeNull()
  })

  it('flags dropped apply URL and invented % / branding', () => {
    const template = buildOutreachFollowUpDraft({
      subject: 'Re: hello',
      organizationName: 'Test Kinder',
      targetId: 'OT-TEST-1',
      intent: 'interested',
    })
    expect(outreachLlmDroppedApplyUrl('Thanks only', template.text)).toBe(true)
    expect(outreachLlmDroppedApplyUrl(template.text, template.text)).toBe(false)
    expect(outreachLlmInventedPercent('We offer 15% cashback.', template.text)).toBe(
      true
    )
    expect(
      outreachLlmInventedBrandingContact(
        `${template.text}\ninfo@selpic.com.au`,
        template.text
      )
    ).toBe(true)
  })

  it('rejects dropped Hi, greeting and trivial no-op polish (learned practice sample)', () => {
    const template = buildOutreachFollowUpDraft({
      subject: 'Re: SELPIC Fundraising partnership',
      organizationName: 'Sample Kindergarten (practice)',
      targetId: 'OT-PRACTICE-1',
      intent: 'interested',
    })
    const withoutHi = template.text.replace(/^Hi,\n\n/, '')
    expect(outreachLlmDroppedGreeting(withoutHi, template.text)).toBe(true)
    expect(outreachLlmTrivialChange(withoutHi, template.text)).toBe(true)
    expect(outreachLlmTrivialChange(template.text, template.text)).toBe(true)
    expect(
      outreachLlmTrivialChange(
        template.text.replace('Happy to answer', 'Glad to answer'),
        template.text
      )
    ).toBe(false)
    expect(parseOutreachLlmJson(JSON.stringify({ subject: 'Re: x', text: withoutHi }))).toBeNull()
  })

  it('returns fresh template when useLlm is false', async () => {
    const fetchImpl = vi.fn()
    const result = await polishOutreachFollowUpDraftWithLlm({
      input: {
        subject: 'Re: hello',
        organizationName: 'Test Kinder',
        targetId: 'OT-TEST-1',
        intent: 'interested',
        existingSubject: 'Edited',
        existingText: 'Edited body without url',
      },
      useLlm: false,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(result.text).toContain('target_id=OT-TEST-1')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses LLM text when grounded JSON keeps apply URL', async () => {
    const fresh = buildOutreachFollowUpDraft({
      subject: 'Re: hello',
      organizationName: 'Test Kinder',
      targetId: 'OT-TEST-1',
      intent: 'question',
    })
    const polished = fresh.text.replace('Happy to clarify', 'Happy to clarify your question')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: fresh.subject,
                text: polished,
              }),
            },
          },
        ],
      }),
    })

    const result = await polishOutreachFollowUpDraftWithLlm({
      input: {
        subject: 'Re: hello',
        organizationName: 'Test Kinder',
        targetId: 'OT-TEST-1',
        intent: 'question',
        excerpt: 'How does commission work?',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('llm')
    expect(result.text).toContain('clarify your question')
    expect(result.text).toContain('target_id=OT-TEST-1')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back when LLM drops apply URL', async () => {
    const fresh = buildOutreachFollowUpDraft({
      subject: 'Re: hello',
      targetId: 'OT-TEST-1',
      intent: 'interested',
    })
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: fresh.subject,
                text: 'Hi,\n\nThanks!\n\nKind regards,\nSELPIC Fundraising',
              }),
            },
          },
        ],
      }),
    })

    const result = await polishOutreachFollowUpDraftWithLlm({
      input: {
        subject: 'Re: hello',
        targetId: 'OT-TEST-1',
        intent: 'interested',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('template')
    expect(result.text).toContain('target_id=OT-TEST-1')
  })

  it('falls back when LLM drops Hi, only (practice sample cousin)', async () => {
    const fresh = buildOutreachFollowUpDraft({
      subject: 'Re: SELPIC Fundraising partnership',
      organizationName: 'Sample Kindergarten (practice)',
      targetId: 'OT-PRACTICE-1',
      intent: 'interested',
    })
    const withoutHi = fresh.text.replace(/^Hi,\n\n/, '')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: fresh.subject,
                text: withoutHi,
              }),
            },
          },
        ],
      }),
    })

    const result = await polishOutreachFollowUpDraftWithLlm({
      input: {
        subject: fresh.subject,
        organizationName: 'Sample Kindergarten (practice)',
        targetId: 'OT-PRACTICE-1',
        intent: 'interested',
        excerpt: 'Thanks — we are interested.',
        existingSubject: fresh.subject,
        existingText: fresh.text,
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('template')
    expect(result.text.startsWith('Hi,')).toBe(true)
  })
})
