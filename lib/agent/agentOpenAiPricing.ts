/**
 * Conservative USD cost estimates for Agent OpenAI calls (HITL).
 * Not OpenAI Billing — accounting sandbox IndexedDB may differ.
 *
 * Cousins: gpt-4o-mini vs gpt-4o, vision same chat pricing, image flat per call,
 * unknown model fallback, zero tokens, kill-switch (no call → no charge).
 */

export type ChatUsageTokens = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** Input/output USD per 1M tokens — slightly above list prices. */
const CHAT_PRICES: Record<string, { inPer1M: number; outPer1M: number }> = {
  'gpt-4o-mini': { inPer1M: 0.2, outPer1M: 0.8 },
  'gpt-4o': { inPer1M: 3.0, outPer1M: 12.0 },
  'gpt-4.1-mini': { inPer1M: 0.5, outPer1M: 2.0 },
  'gpt-4.1': { inPer1M: 2.5, outPer1M: 10.0 },
}

const DEFAULT_CHAT = { inPer1M: 0.5, outPer1M: 2.0 }

/** Flat estimate per Images API success (edit or generate). */
export const AGENT_IMAGE_FLAT_USD = 0.04

export function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase() || 'gpt-4o-mini'
}

export function estimateChatCostUsd(model: string, usage: ChatUsageTokens): number {
  const key = normalizeModelKey(model)
  const prices = CHAT_PRICES[key] || DEFAULT_CHAT
  const prompt = Math.max(0, usage.promptTokens || 0)
  const completion = Math.max(0, usage.completionTokens || 0)
  const cost =
    (prompt / 1_000_000) * prices.inPer1M + (completion / 1_000_000) * prices.outPer1M
  return Math.round(cost * 1_000_000) / 1_000_000
}

export function estimateImageCostUsd(_model?: string): number {
  return AGENT_IMAGE_FLAT_USD
}

export function parseChatUsageFromResponse(json: unknown): ChatUsageTokens | null {
  if (!json || typeof json !== 'object') return null
  const usage = (json as { usage?: Record<string, unknown> }).usage
  if (!usage || typeof usage !== 'object') return null
  const promptTokens = Number(usage.prompt_tokens) || 0
  const completionTokens = Number(usage.completion_tokens) || 0
  const totalTokens =
    Number(usage.total_tokens) || promptTokens + completionTokens
  if (promptTokens <= 0 && completionTokens <= 0 && totalTokens <= 0) return null
  return { promptTokens, completionTokens, totalTokens }
}
