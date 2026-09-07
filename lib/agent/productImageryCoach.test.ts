import { describe, expect, it } from 'vitest'
import {
  isWeakProductImagery,
  summarizeWeakProductImagery,
  weakImageryReason,
} from './productImageryCoach'
import {
  buildPhotoBriefTemplate,
  parseImageryAssistJson,
  isHttpsImageUrl,
} from './productImageryVisionLlm'
import {
  buildPerformanceOpportunities,
  emptyPerformanceCoachInputs,
} from './performanceCoachBuild'

describe('isWeakProductImagery', () => {
  it('skips out-of-stock products', () => {
    expect(isWeakProductImagery({ inStock: false, image: '' })).toBe(false)
  })

  it('flags missing primary image', () => {
    expect(isWeakProductImagery({ inStock: true, name: 'A', image: '' })).toBe(true)
  })

  it('flags indexeddb and data URLs', () => {
    expect(
      isWeakProductImagery({ inStock: true, image: 'indexeddb://abc' })
    ).toBe(true)
    expect(weakImageryReason({ image: 'indexeddb://abc' })).toMatch(/indexeddb/i)
    expect(isWeakProductImagery({ inStock: true, image: 'data:image/png;base64,xx' })).toBe(
      true
    )
  })

  it('accepts https primary images', () => {
    expect(
      isWeakProductImagery({
        inStock: true,
        image: 'https://cdn.example.com/p.jpg',
      })
    ).toBe(false)
  })
})

describe('summarizeWeakProductImagery', () => {
  it('lists samples with reasons', () => {
    const summary = summarizeWeakProductImagery([
      { id: '1', name: 'No shot', image: '', inStock: true },
      { id: '2', name: 'Ok', image: 'https://cdn.example.com/a.jpg', inStock: true },
    ])
    expect(summary.count).toBe(1)
    expect(summary.samples[0]?.reason).toMatch(/missing/i)
  })
})

describe('productImageryVision helpers', () => {
  it('builds a photo brief template without commerce claims', () => {
    const brief = buildPhotoBriefTemplate({ name: 'Dino labels', category: 'Stickers' })
    expect(brief.checklist.length).toBeGreaterThanOrEqual(4)
    expect(brief.source).toBe('template')
  })

  it('parses checklist JSON', () => {
    const parsed = parseImageryAssistJson(
      JSON.stringify({ title: 'Review', checklist: ['Crop tighter', 'Softer light'] }),
      'vision_review'
    )
    expect(parsed?.checklist).toEqual(['Crop tighter', 'Softer light'])
  })

  it('only allows https image URLs for Vision', () => {
    expect(isHttpsImageUrl('https://x.com/a.jpg')).toBe(true)
    expect(isHttpsImageUrl('indexeddb://x')).toBe(false)
  })
})

describe('weak_product_imagery performance card', () => {
  it('surfaces site-upgrade card with product deep-links', () => {
    const cards = buildPerformanceOpportunities({
      ...emptyPerformanceCoachInputs(),
      weakProductImagery: {
        count: 2,
        sampleName: 'No shot',
        sampleNames: ['No shot', 'Bad url'],
        samples: [
          { id: 'sku-1', name: 'No shot', reason: 'missing primary image' },
          { id: 'sku-2', name: 'Bad url', reason: 'browser-only indexeddb URL' },
        ],
      },
    })
    const card = cards.find((c) => c.id === 'weak_product_imagery')
    expect(card?.kind).toBe('site_upgrade')
    expect(card?.href).toBe('/admin/products')
    expect(card?.items?.[0]?.href).toContain('q=sku-1')
    expect(card?.nextSteps?.some((s) => /Vision|Media Library/i.test(s))).toBe(true)
  })
})
