/**
 * Product image HITL — shared prompts + provider router facade.
 * OpenAI: productImage/openaiImagesProvider.ts · Google: productImage/googleGeminiImage.ts
 *
 * Cousins: AGENT_PRODUCT_IMAGE_GEN=0, AGENT_IMAGE_PROVIDER, per-request provider (W2.5),
 * AGENT_DRAFT_LLM=0 (openai only), missing key, non-https source, oversized downloads,
 * prompt injection of prices.
 */

import { buildPhotoBriefTemplate } from './productImageryVisionLlm'
import {
  isAnyProductImageProviderConfigured,
  resolveProductImageProvider,
} from './productImage/resolveProductImageProvider'
import type { ProductImageGenResult } from './productImage/types'

export { AGENT_PRODUCT_IMAGE_GEN_KILL } from './productImage/types'
export type { ProductImageProviderId } from './productImage/types'

const MAX_PROMPT = 2_500

export function isProductImageGenEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAnyProductImageProviderConfigured(env)
}

export function buildImageEditPrompt(input: {
  name: string
  category?: string
  extraPrompt?: string
  briefChecklist?: string[]
}): string {
  const name = (input.name || '').trim() || 'product'
  const category = (input.category || '').trim() || 'stickers / labels'
  const extra = (input.extraPrompt || '').trim()
  const fromBrief = (input.briefChecklist || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)

  const parts = [
    `Create an improved storefront product photo for SELPIC (Australian ${category} shop).`,
    `Product: ${name}.`,
    'Keep the real product identity, colours, and print detail accurate — do not invent brand logos, prices, stock badges, or shipping claims as text overlays.',
    'Prefer clean lighting, neutral background, product filling the frame with a small crop margin for PDP cards.',
    'Photorealistic ecommerce style suitable for parents and school gear.',
  ]
  if (fromBrief.length) {
    parts.push('Follow this photo brief:')
    for (const line of fromBrief) parts.push(`- ${line}`)
  }
  if (extra) parts.push(`Additional direction: ${extra}`)
  return parts.join('\n').slice(0, MAX_PROMPT)
}

/** Strip inventable commerce lines from admin free-text before sending to Images API. */
export function sanitizeImagePrompt(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (/\$\s*\d|\bAUD\s*\d|\b\d+\s*%\s*off\b/i.test(line)) return false
      if (/\b(in stock|ships? (in|within)|delivery in)\b/i.test(line)) return false
      return true
    })
    .join('\n')
    .slice(0, MAX_PROMPT)
}

export function defaultBriefLinesForPrompt(name: string, category?: string): string[] {
  return buildPhotoBriefTemplate({ name, category }).checklist
}

/**
 * Edit existing https image, or generate from prompt when no usable source.
 * `provider` = per-request UI override (W2.5); omit to use env default.
 */
export async function generateOrEditProductImage(opts: {
  prompt: string
  sourceImageUrl?: string
  provider?: string | null
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<ProductImageGenResult> {
  const env = opts.env ?? process.env
  const resolved = resolveProductImageProvider(env, opts.provider)
  if ('missing' in resolved) {
    return { ok: false, error: resolved.error, provider: resolved.id }
  }

  const prompt = sanitizeImagePrompt(opts.prompt)
  if (prompt.length < 20) {
    return {
      ok: false,
      provider: resolved.id,
      error: 'Prompt too short after safety filters. Add a photo brief or directions.',
    }
  }

  return resolved.generateOrEdit({
    prompt,
    sourceImageUrl: opts.sourceImageUrl,
    env,
    fetchImpl: opts.fetchImpl,
  })
}
