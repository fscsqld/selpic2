/**
 * OpenAI Images edit/generate for product primary photos (HITL).
 * Returns PNG bytes; callers upload to Media / Apply on the product form.
 *
 * Cousins: AGENT_PRODUCT_IMAGE_GEN=0, AGENT_DRAFT_LLM=0, missing key,
 * non-https source, org verification errors, oversized downloads, prompt injection of prices.
 */

import { isAgentOpenAiEnabled } from './agentOpenAiChat'
import { buildPhotoBriefTemplate } from './productImageryVisionLlm'

export const AGENT_PRODUCT_IMAGE_GEN_KILL = 'AGENT_PRODUCT_IMAGE_GEN'

const DEFAULT_IMAGE_MODEL = 'gpt-image-1'
const MAX_PROMPT = 2_500
const MAX_SOURCE_BYTES = 15 * 1024 * 1024

export function isProductImageGenEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, AGENT_PRODUCT_IMAGE_GEN_KILL)
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

type OpenAiImagesResponse = {
  data?: Array<{ b64_json?: string; url?: string }>
  error?: { message?: string }
}

async function fetchHttpsImageBytes(
  imageUrl: string,
  fetchImpl: typeof fetch
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  if (!/^https:\/\//i.test(imageUrl.trim())) return null
  const res = await fetchImpl(imageUrl.trim(), { redirect: 'follow' })
  if (!res.ok) return null
  const contentType = (res.headers.get('content-type') || 'image/png').split(';')[0].trim()
  if (!contentType.startsWith('image/')) return null
  const ab = await res.arrayBuffer()
  if (ab.byteLength < 32 || ab.byteLength > MAX_SOURCE_BYTES) return null
  const ext =
    contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png'
  return {
    buffer: Buffer.from(ab),
    contentType,
    filename: `source.${ext}`,
  }
}

/**
 * Edit existing https image, or generate from prompt when no usable source.
 * Returns PNG base64 (no data: prefix).
 */
export async function generateOrEditProductImage(opts: {
  prompt: string
  sourceImageUrl?: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}): Promise<
  | { ok: true; mode: 'edit' | 'generate'; b64: string; model: string }
  | { ok: false; error: string }
> {
  const env = opts.env ?? process.env
  if (!isProductImageGenEnabled(env)) {
    return {
      ok: false,
      error:
        'Product image AI is disabled (set OPENAI_API_KEY and do not set AGENT_PRODUCT_IMAGE_GEN=0).',
    }
  }

  const prompt = sanitizeImagePrompt(opts.prompt)
  if (prompt.length < 20) {
    return { ok: false, error: 'Prompt too short after safety filters. Add a photo brief or directions.' }
  }

  const apiKey = env.OPENAI_API_KEY!.trim()
  const model =
    (env.AGENT_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL
  const fetchImpl = opts.fetchImpl ?? fetch

  const sourceUrl = (opts.sourceImageUrl || '').trim()
  const source = sourceUrl
    ? await fetchHttpsImageBytes(sourceUrl, fetchImpl)
    : null

  try {
    if (source) {
      const form = new FormData()
      form.set('model', model)
      form.set('prompt', prompt)
      form.set('size', '1024x1024')
      form.set(
        'image',
        new File([new Uint8Array(source.buffer)], source.filename, {
          type: source.contentType,
        })
      )

      const res = await fetchImpl('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      })
      const json = (await res.json().catch(() => null)) as OpenAiImagesResponse | null
      if (!res.ok) {
        return {
          ok: false,
          error:
            json?.error?.message ||
            `OpenAI image edit failed (${res.status}). Check Images API access / org verification.`,
        }
      }
      const b64 = json?.data?.[0]?.b64_json
      if (!b64) {
        return { ok: false, error: 'OpenAI edit returned no image data.' }
      }
      return { ok: true, mode: 'edit', b64, model }
    }

    const res = await fetchImpl('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        size: '1024x1024',
        n: 1,
      }),
    })
    const json = (await res.json().catch(() => null)) as OpenAiImagesResponse | null
    if (!res.ok) {
      return {
        ok: false,
        error:
          json?.error?.message ||
          `OpenAI image generate failed (${res.status}). Check Images API access / org verification.`,
      }
    }
    let b64 = json?.data?.[0]?.b64_json
    if (!b64 && json?.data?.[0]?.url) {
      const imgRes = await fetchImpl(json.data[0].url)
      if (!imgRes.ok) {
        return { ok: false, error: 'Failed to download generated image URL.' }
      }
      b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64')
    }
    if (!b64) {
      return { ok: false, error: 'OpenAI generate returned no image data.' }
    }
    return { ok: true, mode: 'generate', b64, model }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Image generation request failed',
    }
  }
}
