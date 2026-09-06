import { describe, expect, it, vi } from 'vitest'
import { buildProductDescriptionDraft } from './productDescriptionDraft'
import {
  isProductDescriptionLlmEnabled,
  parseProductDescriptionLlmJson,
  polishProductDescriptionWithLlm,
  productDescriptionInventedCommerce,
} from './productDescriptionDraftLlm'

describe('productDescriptionDraftLlm', () => {
  it('builds short and detail templates without invented prices or internal meta', () => {
    const short = buildProductDescriptionDraft({
      field: 'description',
      name: 'Name Labels',
      category: 'Stickers',
    })
    expect(short.text.toLowerCase()).toContain('name labels')
    expect(short.text).not.toMatch(/\$\d/)
    expect(short.text).not.toMatch(/Do not invent|Draft only|Apply to the form/i)

    const detail = buildProductDescriptionDraft({
      field: 'detailDescription',
      name: 'Name Labels',
      category: 'Stickers',
      existingText: 'Waterproof finish for drink bottles.',
    })
    expect(detail.text).toContain('Waterproof finish for drink bottles.')
    expect(detail.text).toContain('Key Highlights')
    expect(detail.text).not.toMatch(/Do not invent|Draft only|Keep these verified/i)
    expect(detail.text).not.toMatch(/\$\d/)
    // Short hook only once in skeleton — not duplicated section blocks.
    expect(detail.text.match(/Key Highlights/gi)?.length).toBe(1)
  })

  it('does not append generic skeleton onto substantial existing PDP copy', () => {
    const existing = [
      '9-Color Pastel Pearl Dual-Size Combo Pack',
      '',
      'Shimmering Elegance, Now in Two Perfect Sizes!',
      'Why choose between small and large when you can have both?',
      '',
      '✨ Key Highlights',
      'Two Essential Sizes in One Pack: Medium and Large.',
      '',
      '📏 Size Guide & Best Uses',
      '1. Medium Size (30mm × 15mm) — Compact & Versatile',
      '',
      '📋 Product Specifications',
      'Material: High-Quality Waterproof PET Film',
      '',
      '💡 Versatile Use Cases',
      'School & Office: Color-code stationery.',
    ].join('\n')
    const detail = buildProductDescriptionDraft({
      field: 'detailDescription',
      name: '9-Color Pastel Pearl Dual-Size Combo Pack',
      category: 'Stickers',
      existingText: existing,
    })
    expect(detail.text).toBe(existing)
    expect(detail.text.match(/Key Highlights/gi)?.length).toBe(1)
    expect(detail.text).not.toContain('Edit to match your product options')
    expect(detail.text).not.toContain('Clear labels. Everyday gear.')
  })

  it('strips leaked meta when regenerating over dirty existing text', () => {
    const detail = buildProductDescriptionDraft({
      field: 'detailDescription',
      name: 'Name Labels',
      category: 'Stickers',
      existingText: 'Do not invent prices. Draft only — Apply to the form.',
    })
    expect(detail.text).not.toMatch(/Do not invent|Draft only/i)
    expect(detail.text.startsWith('Name Labels')).toBe(true)
  })

  it('respects kill switches', () => {
    expect(isProductDescriptionLlmEnabled({ OPENAI_API_KEY: 'sk-x' })).toBe(true)
    expect(
      isProductDescriptionLlmEnabled({
        OPENAI_API_KEY: 'sk-x',
        AGENT_PRODUCT_DESCRIPTION_LLM: '0',
      })
    ).toBe(false)
  })

  it('rejects invented commerce facts', () => {
    const allowed = 'Name Labels for school bags'
    expect(productDescriptionInventedCommerce('Only $9.99 today', allowed)).toBe(true)
    expect(productDescriptionInventedCommerce('20% off this week', allowed)).toBe(true)
    expect(productDescriptionInventedCommerce('Ships within 2 days', allowed)).toBe(true)
    expect(productDescriptionInventedCommerce('Durable for school bags', allowed)).toBe(false)
  })

  it('parses JSON text', () => {
    expect(parseProductDescriptionLlmJson('{"text":"Hello product"}', 'description')).toEqual({
      text: 'Hello product',
    })
    expect(parseProductDescriptionLlmJson('{"text":""}', 'description')).toBeNull()
  })

  it('returns template when useLlm is false', async () => {
    const fetchImpl = vi.fn()
    const result = await polishProductDescriptionWithLlm({
      input: { field: 'description', name: 'Labels', category: 'Stickers' },
      useLlm: false,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('falls back when LLM invents a price', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: 'Great labels for only $12.50 with free shipping tomorrow.',
              }),
            },
          },
        ],
      }),
    })
    const result = await polishProductDescriptionWithLlm({
      input: {
        field: 'description',
        name: 'Labels',
        category: 'Stickers',
        existingText: 'Great labels for school bags.',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('template')
    expect(result.text).not.toMatch(/\$12/)
  })

  it('accepts grounded polish', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: 'Clear name labels for school bags and lunchboxes.',
              }),
            },
          },
        ],
      }),
    })
    const result = await polishProductDescriptionWithLlm({
      input: {
        field: 'description',
        name: 'Name Labels',
        category: 'Stickers',
        existingText: 'Name labels for school bags.',
      },
      useLlm: true,
      env: { OPENAI_API_KEY: 'sk-test' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.source).toBe('llm')
    expect(result.text).toContain('lunchboxes')
  })
})
