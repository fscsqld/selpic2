import { describe, expect, it, vi } from 'vitest'
import { buildInboundReplyDraft } from './inboundDraft'
import {
  isInboundDraftLlmEnabled,
  llmDraftInventedOrderRef,
  parseLlmDraftJson,
  polishInboundReplyDraftWithLlm,
} from './inboundDraftLlm'

describe('inboundDraftLlm', () => {
  it('disables LLM without key or with kill switch', () => {
    expect(isInboundDraftLlmEnabled({})).toBe(false)
    expect(isInboundDraftLlmEnabled({ OPENAI_API_KEY: 'sk-test' })).toBe(true)
    expect(
      isInboundDraftLlmEnabled({ OPENAI_API_KEY: 'sk-test', AGENT_INBOUND_DRAFT_LLM: '0' })
    ).toBe(false)
  })

  it('parses JSON draft and rejects empty / truncated bodies', () => {
    expect(parseLlmDraftJson('{"subject":"Re: Hi","body":"Dear Pat,\\n\\nThanks."}')).toEqual({
      subject: 'Re: Hi',
      body: 'Dear Pat,\n\nThanks.',
    })
    expect(parseLlmDraftJson('{"subject":"","body":"Dear Pat,"}')).toBeNull()
    expect(parseLlmDraftJson('not json')).toBeNull()
  })

  it('flags invented order refs not in the source set', () => {
    const allowed = new Set(['ORD-5512'])
    expect(llmDraftInventedOrderRef('Tracking ORD-5512', allowed)).toBeUndefined()
    expect(llmDraftInventedOrderRef('We found ORD-9999', allowed)).toMatch(/ORD-9999/i)
  })

  it('falls back to template when LLM is disabled', async () => {
    const template = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Alex',
      customerEmail: 'a@example.com',
      subject: 'Where is my order?',
      bodyExcerpt: 'Still waiting on tracking',
    })
    const fetchImpl = vi.fn()
    const result = await polishInboundReplyDraftWithLlm({
      template,
      input: {
        channel: 'message',
        customerName: 'Alex',
        customerEmail: 'a@example.com',
        subject: 'Where is my order?',
        bodyExcerpt: 'Still waiting on tracking',
      },
      useLlm: true,
      env: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(result.body).toBe(template.body)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('skips OpenAI when useLlm is false even if a key is present', async () => {
    const template = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Alex',
      customerEmail: 'a@example.com',
      subject: 'Hello',
      bodyExcerpt: 'Just checking in',
    })
    const fetchImpl = vi.fn()
    const result = await polishInboundReplyDraftWithLlm({
      template,
      input: {
        channel: 'message',
        customerName: 'Alex',
        customerEmail: 'a@example.com',
        subject: 'Hello',
        bodyExcerpt: 'Just checking in',
      },
      useLlm: false,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses LLM body when the API returns grounded JSON', async () => {
    const template = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Alex',
      customerEmail: 'a@example.com',
      subject: 'Where is my order?',
      bodyExcerpt: 'Still waiting on tracking for ORD-5512',
    })
    const llmBody =
      'Dear Alex,\n\nThanks for writing about your delivery. We will check tracking for ORD-5512.\n\nKind regards,\nSelpic Customer Care'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Re: Where is my order?',
                body: llmBody,
              }),
            },
          },
        ],
      }),
    })

    const result = await polishInboundReplyDraftWithLlm({
      template,
      input: {
        channel: 'message',
        customerName: 'Alex',
        customerEmail: 'a@example.com',
        subject: 'Where is my order?',
        bodyExcerpt: 'Still waiting on tracking for ORD-5512',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('llm')
    expect(result.body).toContain('ORD-5512')
    expect(result.intentHint).toBe(template.intentHint)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back when LLM invents an order ref', async () => {
    const template = buildInboundReplyDraft({
      channel: 'message',
      customerName: 'Alex',
      customerEmail: 'a@example.com',
      subject: 'Hello',
      bodyExcerpt: 'Just checking in',
    })
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subject: 'Re: Hello',
                body: 'Dear Alex,\n\nWe shipped ORD-9999 yesterday.\n\nKind regards,\nSelpic Customer Care',
              }),
            },
          },
        ],
      }),
    })

    const result = await polishInboundReplyDraftWithLlm({
      template,
      input: {
        channel: 'message',
        customerName: 'Alex',
        customerEmail: 'a@example.com',
        subject: 'Hello',
        bodyExcerpt: 'Just checking in',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('template')
    expect(result.body).toBe(template.body)
  })
})
