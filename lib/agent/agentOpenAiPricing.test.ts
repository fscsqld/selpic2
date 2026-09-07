/**
 * Agent OpenAI pricing + month summary unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  estimateChatCostUsd,
  estimateImageCostUsd,
  parseChatUsageFromResponse,
  AGENT_IMAGE_FLAT_USD,
} from './agentOpenAiPricing'
import {
  buildChatRunRecord,
  buildImageRunRecord,
  summarizeAgentRunsForMonth,
  utcMonthKey,
} from './agentRuns'

describe('agentOpenAiPricing', () => {
  it('estimates gpt-4o-mini chat cost from tokens', () => {
    const cost = estimateChatCostUsd('gpt-4o-mini', {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
    })
    expect(cost).toBeCloseTo(0.2 + 0.8, 6)
  })

  it('uses flat image estimate', () => {
    expect(estimateImageCostUsd('gpt-image-1')).toBe(AGENT_IMAGE_FLAT_USD)
  })

  it('parses usage from OpenAI-shaped JSON', () => {
    expect(
      parseChatUsageFromResponse({
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      })
    ).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 })
  })

  it('returns null when usage missing (kill / failed path)', () => {
    expect(parseChatUsageFromResponse({})).toBeNull()
  })
})

describe('agentRuns summarize', () => {
  it('returns zeros for empty month', () => {
    const month = utcMonthKey()
    const summary = summarizeAgentRunsForMonth([], month)
    expect(summary.callCount).toBe(0)
    expect(summary.totalCostUsd).toBe(0)
    expect(summary.bySector).toEqual({})
  })

  it('aggregates chat vs image by sector', () => {
    const month = '2026-09'
    const chat = buildChatRunRecord({
      id: 'c1',
      sector: 'inbound',
      action: 'polish',
      model: 'gpt-4o-mini',
      adminLabel: 'a@test.com',
      usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
      createdAt: '2026-09-15T12:00:00.000Z',
    })
    const image = buildImageRunRecord({
      id: 'i1',
      action: 'product_image_generate',
      model: 'gpt-image-1',
      adminLabel: 'a@test.com',
      createdAt: '2026-09-16T12:00:00.000Z',
    })
    const outside = buildImageRunRecord({
      id: 'i2',
      action: 'product_image_generate',
      model: 'gpt-image-1',
      adminLabel: 'a@test.com',
      createdAt: '2026-08-01T12:00:00.000Z',
    })
    const summary = summarizeAgentRunsForMonth([chat, image, outside], month)
    expect(summary.callCount).toBe(2)
    expect(summary.chatCalls).toBe(1)
    expect(summary.imageCalls).toBe(1)
    expect(summary.bySector.inbound.calls).toBe(1)
    expect(summary.bySector.products.calls).toBe(1)
    expect(summary.totalCostUsd).toBeGreaterThan(0)
  })
})
