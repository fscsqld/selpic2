import { describe, expect, it } from 'vitest'
import {
  buildImageEditPrompt,
  isProductImageGenEnabled,
  sanitizeImagePrompt,
} from './productImageryGenerate'

describe('productImageryGenerate helpers', () => {
  it('builds a prompt that includes product name and brief lines', () => {
    const prompt = buildImageEditPrompt({
      name: 'Pastel Pearl Pack',
      category: 'Stickers',
      briefChecklist: ['Soft even light', 'Neutral background'],
      extraPrompt: 'Keep glitter visible',
    })
    expect(prompt).toMatch(/Pastel Pearl Pack/)
    expect(prompt).toMatch(/Soft even light/)
    expect(prompt).toMatch(/Keep glitter visible/)
    expect(prompt).not.toMatch(/\$\d/)
  })

  it('strips commerce claims from free-text prompt lines', () => {
    const cleaned = sanitizeImagePrompt('Soft light\nOnly $9.99 today\nShips within 2 days\nFill the frame')
    expect(cleaned).toMatch(/Soft light/)
    expect(cleaned).toMatch(/Fill the frame/)
    expect(cleaned).not.toMatch(/\$9\.99/)
    expect(cleaned).not.toMatch(/Ships within/)
  })

  it('respects AGENT_PRODUCT_IMAGE_GEN kill switch', () => {
    expect(
      isProductImageGenEnabled({
        OPENAI_API_KEY: 'sk-test',
        AGENT_PRODUCT_IMAGE_GEN: '0',
      })
    ).toBe(false)
    expect(
      isProductImageGenEnabled({
        OPENAI_API_KEY: 'sk-test',
      })
    ).toBe(true)
  })
})
