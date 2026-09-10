/**
 * Product image provider router — W1 OpenAI + W2 Google.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  parseProductImageProviderId,
  resolveProductImageProvider,
} from './resolveProductImageProvider'
import {
  extractGeminiInlineImageB64,
  googleGeminiImageProvider,
} from './googleGeminiImage'
import { sanitizeImagePrompt } from '../productImageryGenerate'
import { sanitizeAgentRun } from '../agentRuns'
import {
  AGENT_GOOGLE_IMAGE_FLAT_USD,
  AGENT_IMAGE_FLAT_USD,
  estimateImageCostUsd,
} from '../agentOpenAiPricing'

describe('parseProductImageProviderId', () => {
  it('defaults blank and openai to openai', () => {
    expect(parseProductImageProviderId(undefined)).toBe('openai')
    expect(parseProductImageProviderId('')).toBe('openai')
    expect(parseProductImageProviderId('OpenAI')).toBe('openai')
  })

  it('accepts google id', () => {
    expect(parseProductImageProviderId('google')).toBe('google')
  })

  it('falls back unknown ids to openai', () => {
    expect(parseProductImageProviderId('banana')).toBe('openai')
  })
})

describe('resolveProductImageProvider', () => {
  it('respects master kill switch', () => {
    const r = resolveProductImageProvider({
      AGENT_PRODUCT_IMAGE_GEN: '0',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_GEMINI_API_KEY: 'g-test',
      AGENT_IMAGE_PROVIDER: 'google',
    })
    expect('missing' in r).toBe(true)
    if ('missing' in r) expect(r.error).toMatch(/AGENT_PRODUCT_IMAGE_GEN/)
  })

  it('resolves google when key present', () => {
    const r = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'google',
      GOOGLE_GEMINI_API_KEY: 'g-test',
    })
    expect('missing' in r).toBe(false)
    if (!('missing' in r)) expect(r.id).toBe('google')
  })

  it('accepts GEMINI_API_KEY alias for google', () => {
    const r = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'google',
      GEMINI_API_KEY: 'alias-key',
    })
    expect('missing' in r).toBe(false)
    if (!('missing' in r)) expect(r.id).toBe('google')
  })

  it('returns clear error when google selected without key', () => {
    const r = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'google',
      OPENAI_API_KEY: 'sk-test',
    })
    expect('missing' in r).toBe(true)
    if ('missing' in r) {
      expect(r.id).toBe('google')
      expect(r.error).toMatch(/GOOGLE_GEMINI_API_KEY/)
    }
  })

  it('google works even when AGENT_DRAFT_LLM=0 (openai images would not)', () => {
    const google = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'google',
      GOOGLE_GEMINI_API_KEY: 'g-test',
      AGENT_DRAFT_LLM: '0',
    })
    expect('missing' in google).toBe(false)

    const openai = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test',
      AGENT_DRAFT_LLM: '0',
    })
    expect('missing' in openai).toBe(true)
  })

  it('resolves openai when key present', () => {
    const r = resolveProductImageProvider({
      OPENAI_API_KEY: 'sk-test',
    })
    expect('missing' in r).toBe(false)
    if (!('missing' in r)) expect(r.id).toBe('openai')
  })
})

describe('extractGeminiInlineImageB64', () => {
  it('reads camelCase inlineData', () => {
    expect(
      extractGeminiInlineImageB64({
        candidates: [
          { content: { parts: [{ inlineData: { data: 'a'.repeat(40), mimeType: 'image/png' } }] } },
        ],
      })
    ).toBe('a'.repeat(40))
  })

  it('reads snake_case inline_data', () => {
    expect(
      extractGeminiInlineImageB64({
        candidates: [
          {
            content: {
              parts: [{ inline_data: { data: 'b'.repeat(40), mime_type: 'image/png' } }],
            },
          },
        ],
      })
    ).toBe('b'.repeat(40))
  })

  it('returns null when text-only', () => {
    expect(
      extractGeminiInlineImageB64({
        candidates: [{ content: { parts: [{ text: 'Sorry, I cannot.' }] } }],
      })
    ).toBeNull()
  })
})

describe('googleGeminiImageProvider generateOrEdit', () => {
  it('maps successful generateContent to b64 contract', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: 'c'.repeat(48), mimeType: 'image/png' } }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as unknown as typeof fetch

    const result = await googleGeminiImageProvider.generateOrEdit({
      prompt: 'Clean white background product shot for SELPIC stickers storefront.',
      env: { GOOGLE_GEMINI_API_KEY: 'g-test' },
      fetchImpl,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.provider).toBe('google')
      expect(result.mode).toBe('generate')
      expect(result.b64.length).toBeGreaterThan(32)
      expect(result.model).toMatch(/gemini/)
    }
  })

  it('returns English error when Google returns text only', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'I cannot create that image.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as unknown as typeof fetch

    const result = await googleGeminiImageProvider.generateOrEdit({
      prompt: 'Clean white background product shot for SELPIC stickers storefront.',
      env: { GOOGLE_GEMINI_API_KEY: 'g-test' },
      fetchImpl,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.provider).toBe('google')
      expect(result.error).toMatch(/text only|no image/i)
    }
  })
})

describe('estimateImageCostUsd provider branch', () => {
  it('uses Google flat for google provider', () => {
    expect(estimateImageCostUsd('gemini-2.5-flash-image', 'google')).toBe(
      AGENT_GOOGLE_IMAGE_FLAT_USD
    )
  })

  it('defaults missing provider to OpenAI flat', () => {
    expect(estimateImageCostUsd('gpt-image-2')).toBe(AGENT_IMAGE_FLAT_USD)
  })
})

describe('sanitizeImagePrompt cousins', () => {
  it('strips price and ship claims', () => {
    const out = sanitizeImagePrompt('Soft light\n$12.00 AUD\nShips in 3 days\nKeep colours')
    expect(out).toContain('Soft light')
    expect(out).toContain('Keep colours')
    expect(out).not.toMatch(/\$12/)
    expect(out).not.toMatch(/Ships in/i)
  })
})

describe('agentRuns provider legacy', () => {
  it('defaults legacy image rows to openai provider', () => {
    const row = sanitizeAgentRun({
      id: 'i1',
      createdAt: '2026-09-01T00:00:00.000Z',
      sector: 'products',
      action: 'product_image_generate',
      kind: 'image',
      model: 'gpt-image-2',
      adminLabel: 'a',
      estimatedCostUsd: 0.05,
      ok: true,
    })
    expect(row?.provider).toBe('openai')
  })

  it('preserves explicit google provider', () => {
    const row = sanitizeAgentRun({
      id: 'i2',
      createdAt: '2026-09-01T00:00:00.000Z',
      sector: 'products',
      action: 'product_image_generate',
      kind: 'image',
      model: 'gemini-2.5-flash-image',
      provider: 'google',
      adminLabel: 'a',
      estimatedCostUsd: 0.04,
      ok: true,
    })
    expect(row?.provider).toBe('google')
  })
})
