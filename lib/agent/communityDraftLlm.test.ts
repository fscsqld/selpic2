import { describe, expect, it, vi } from 'vitest'
import { buildCommunityPostDraft } from './communityDraft'
import {
  communityLlmInventedBrandingHome,
  isCommunityDraftLlmEnabled,
  parseCommunityLlmJson,
  polishCommunityDraftWithLlm,
} from './communityDraftLlm'
import { isAgentOpenAiEnabled } from './agentOpenAiChat'

describe('communityDraftLlm', () => {
  it('respects global and sector kill switches', () => {
    expect(isAgentOpenAiEnabled({ OPENAI_API_KEY: 'sk-x' })).toBe(true)
    expect(isAgentOpenAiEnabled({ OPENAI_API_KEY: 'sk-x', AGENT_DRAFT_LLM: '0' })).toBe(false)
    expect(
      isCommunityDraftLlmEnabled({
        OPENAI_API_KEY: 'sk-x',
        AGENT_COMMUNITY_DRAFT_LLM: '0',
      })
    ).toBe(false)
  })

  it('parses title/content JSON', () => {
    expect(
      parseCommunityLlmJson('{"title":"Term tips","content":"Pack labels for bags."}')
    ).toEqual({ title: 'Term tips', content: 'Pack labels for bags.' })
    expect(parseCommunityLlmJson('{"title":"","content":"x"}')).toBeNull()
  })

  it('flags invented bare homepage when template had no site URL', () => {
    expect(
      communityLlmInventedBrandingHome('Visit https://selpic.com.au today', 'Pack labels')
    ).toBe(true)
    expect(
      communityLlmInventedBrandingHome(
        'See https://www.selpic.com.au/hot-goods',
        'See https://www.selpic.com.au/hot-goods for Market S'
      )
    ).toBe(false)
  })

  it('skips OpenAI when useLlm is false', async () => {
    const template = buildCommunityPostDraft({ topicId: 'name_label_care' })
    const fetchImpl = vi.fn()
    const result = await polishCommunityDraftWithLlm({
      template,
      useLlm: false,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses LLM title/content when API returns grounded JSON', async () => {
    const template = buildCommunityPostDraft({ topicId: 'name_label_care' })
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Label care for bags and bottles',
                content: 'Wipe the surface dry before applying name labels.',
              }),
            },
          },
        ],
      }),
    })

    const result = await polishCommunityDraftWithLlm({
      template,
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('llm')
    expect(result.title).toContain('Label care')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('strips Sources footer if LLM appends one (cousin of metadata leak)', async () => {
    const template = buildCommunityPostDraft({ topicId: 'seasonal_print_idea' })
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: template.title,
                content:
                  template.content +
                  '\n\n---\nSources:\n• SELPIC seasonal merchandising notes (internal)',
              }),
            },
          },
        ],
      }),
    })

    const result = await polishCommunityDraftWithLlm({
      template,
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.source).toBe('llm')
    expect(result.content).not.toMatch(/Sources:/)
    expect(result.content).not.toContain('merchandising notes')
    const requestBody = String(fetchImpl.mock.calls[0]?.[1]?.body || '')
    expect(requestBody).not.toMatch(/"sources"/)
  })
})
