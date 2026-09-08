/**
 * Product image provider router — W1 (OpenAI only; google reserved).
 */

import { describe, expect, it } from 'vitest'
import {
  parseProductImageProviderId,
  resolveProductImageProvider,
} from './resolveProductImageProvider'
import { sanitizeImagePrompt } from '../productImageryGenerate'
import { sanitizeAgentRun } from '../agentRuns'

describe('parseProductImageProviderId', () => {
  it('defaults blank and openai to openai', () => {
    expect(parseProductImageProviderId(undefined)).toBe('openai')
    expect(parseProductImageProviderId('')).toBe('openai')
    expect(parseProductImageProviderId('OpenAI')).toBe('openai')
  })

  it('accepts google id for future W2', () => {
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
    })
    expect('missing' in r).toBe(true)
    if ('missing' in r) expect(r.error).toMatch(/AGENT_PRODUCT_IMAGE_GEN/)
  })

  it('returns clear error when google selected before W2', () => {
    const r = resolveProductImageProvider({
      AGENT_IMAGE_PROVIDER: 'google',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_GEMINI_API_KEY: 'x',
    })
    expect('missing' in r).toBe(true)
    if ('missing' in r) {
      expect(r.id).toBe('google')
      expect(r.error).toMatch(/not enabled yet/i)
    }
  })

  it('resolves openai when key present', () => {
    const r = resolveProductImageProvider({
      OPENAI_API_KEY: 'sk-test',
    })
    expect('missing' in r).toBe(false)
    if (!('missing' in r)) expect(r.id).toBe('openai')
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
