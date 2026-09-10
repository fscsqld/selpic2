/**
 * Google Gemini image adapter (Nano Banana / gemini-2.5-flash-image).
 * Removable: delete this file + google branch in resolveProductImageProvider (§3.A).
 *
 * Cousins: missing GOOGLE_GEMINI_API_KEY / GEMINI_API_KEY, AGENT_PRODUCT_IMAGE_GEN=0,
 * AGENT_DRAFT_LLM=0 (must NOT disable Google), text-only / blocked responses,
 * non-https source → generate mode, AGENT_GOOGLE_IMAGE_MODEL override.
 */

import { fetchHttpsImageBytes } from './fetchHttpsImageBytes'
import {
  isProductImageMasterKill,
  type ProductImageGenerateOpts,
  type ProductImageGenResult,
  type ProductImageProvider,
} from './types'

export const DEFAULT_GOOGLE_IMAGE_MODEL = 'gemini-2.5-flash-image'
export const GOOGLE_GEMINI_API_KEY_ENV = 'GOOGLE_GEMINI_API_KEY'
export const GEMINI_API_KEY_ALIAS_ENV = 'GEMINI_API_KEY'
export const AGENT_GOOGLE_IMAGE_MODEL_ENV = 'AGENT_GOOGLE_IMAGE_MODEL'

type GeminiPart = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
    finishReason?: string
  }>
  error?: { message?: string; status?: string }
  promptFeedback?: { blockReason?: string }
}

export function readGoogleGeminiApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env[GOOGLE_GEMINI_API_KEY_ENV]?.trim() ||
    env[GEMINI_API_KEY_ALIAS_ENV]?.trim() ||
    ''
  )
}

export function resolveGoogleImageModel(env: NodeJS.ProcessEnv = process.env): string {
  return (
    (env[AGENT_GOOGLE_IMAGE_MODEL_ENV] || DEFAULT_GOOGLE_IMAGE_MODEL).trim() ||
    DEFAULT_GOOGLE_IMAGE_MODEL
  )
}

/** Extract first inline image base64 from Gemini generateContent JSON. */
export function extractGeminiInlineImageB64(json: GeminiGenerateResponse | null): string | null {
  const parts = json?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null
  for (const part of parts) {
    const camel = part.inlineData?.data
    if (typeof camel === 'string' && camel.length > 32) return camel
    const snake = part.inline_data?.data
    if (typeof snake === 'string' && snake.length > 32) return snake
  }
  return null
}

function geminiErrorMessage(json: GeminiGenerateResponse | null, status: number): string {
  if (json?.error?.message) return json.error.message
  if (json?.promptFeedback?.blockReason) {
    return `Google image request blocked (${json.promptFeedback.blockReason}).`
  }
  const finish = json?.candidates?.[0]?.finishReason
  if (finish && finish !== 'STOP') {
    return `Google image finished with ${finish} and no image data.`
  }
  return `Google image generate failed (${status}).`
}

export const googleGeminiImageProvider: ProductImageProvider = {
  id: 'google',

  isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    if (isProductImageMasterKill(env)) return false
    return Boolean(readGoogleGeminiApiKey(env))
  },

  async generateOrEdit(opts: ProductImageGenerateOpts): Promise<ProductImageGenResult> {
    const env = opts.env ?? process.env
    if (!this.isConfigured(env)) {
      return {
        ok: false,
        provider: 'google',
        error:
          'Google product image AI is disabled (set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY; do not set AGENT_PRODUCT_IMAGE_GEN=0).',
      }
    }

    const apiKey = readGoogleGeminiApiKey(env)
    const model = resolveGoogleImageModel(env)
    const fetchImpl = opts.fetchImpl ?? fetch
    const prompt = opts.prompt

    const sourceUrl = (opts.sourceImageUrl || '').trim()
    const source = sourceUrl ? await fetchHttpsImageBytes(sourceUrl, fetchImpl) : null
    const mode: 'edit' | 'generate' = source ? 'edit' : 'generate'

    const parts: Array<Record<string, unknown>> = []
    if (source) {
      parts.push({
        inline_data: {
          mime_type: source.contentType || 'image/png',
          data: source.buffer.toString('base64'),
        },
      })
    }
    parts.push({
      text: source
        ? `Edit this product photo for ecommerce. ${prompt}`
        : `Generate a photorealistic ecommerce product photo. ${prompt}`,
    })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      })
      const json = (await res.json().catch(() => null)) as GeminiGenerateResponse | null
      if (!res.ok) {
        return {
          ok: false,
          provider: 'google',
          error: geminiErrorMessage(json, res.status),
        }
      }
      const b64 = extractGeminiInlineImageB64(json)
      if (!b64) {
        const textHint = json?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join(' ')
          .slice(0, 160)
        return {
          ok: false,
          provider: 'google',
          error: textHint
            ? `Google returned text only (no image): ${textHint}`
            : 'Google image response contained no image data.',
        }
      }
      return { ok: true, mode, b64, model, provider: 'google' }
    } catch (e) {
      return {
        ok: false,
        provider: 'google',
        error: e instanceof Error ? e.message : 'Google image request failed',
      }
    }
  },
}
