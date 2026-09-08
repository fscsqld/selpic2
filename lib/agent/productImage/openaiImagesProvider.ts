/**
 * OpenAI Images adapter for product HITL generate/edit.
 * Removable: delete this file + openai branch in resolveProductImageProvider.
 */

import { isAgentOpenAiEnabled } from '../agentOpenAiChat'
import { fetchHttpsImageBytes } from './fetchHttpsImageBytes'
import {
  AGENT_PRODUCT_IMAGE_GEN_KILL,
  type ProductImageGenerateOpts,
  type ProductImageGenResult,
  type ProductImageProvider,
} from './types'

const DEFAULT_IMAGE_MODEL = 'gpt-image-2'

type OpenAiImagesResponse = {
  data?: Array<{ b64_json?: string; url?: string }>
  error?: { message?: string }
}

export const openaiProductImageProvider: ProductImageProvider = {
  id: 'openai',

  isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return isAgentOpenAiEnabled(env, AGENT_PRODUCT_IMAGE_GEN_KILL)
  },

  async generateOrEdit(opts: ProductImageGenerateOpts): Promise<ProductImageGenResult> {
    const env = opts.env ?? process.env
    if (!this.isConfigured(env)) {
      return {
        ok: false,
        provider: 'openai',
        error:
          'Product image AI is disabled (set OPENAI_API_KEY and do not set AGENT_PRODUCT_IMAGE_GEN=0).',
      }
    }

    const apiKey = env.OPENAI_API_KEY!.trim()
    const model =
      (env.AGENT_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL
    const fetchImpl = opts.fetchImpl ?? fetch
    const prompt = opts.prompt

    const sourceUrl = (opts.sourceImageUrl || '').trim()
    const source = sourceUrl ? await fetchHttpsImageBytes(sourceUrl, fetchImpl) : null

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
            provider: 'openai',
            error:
              json?.error?.message ||
              `OpenAI image edit failed (${res.status}). Check Images API access / org verification.`,
          }
        }
        const b64 = json?.data?.[0]?.b64_json
        if (!b64) {
          return { ok: false, provider: 'openai', error: 'OpenAI edit returned no image data.' }
        }
        return { ok: true, mode: 'edit', b64, model, provider: 'openai' }
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
          provider: 'openai',
          error:
            json?.error?.message ||
            `OpenAI image generate failed (${res.status}). Check Images API access / org verification.`,
        }
      }
      let b64 = json?.data?.[0]?.b64_json
      if (!b64 && json?.data?.[0]?.url) {
        const imgRes = await fetchImpl(json.data[0].url)
        if (!imgRes.ok) {
          return {
            ok: false,
            provider: 'openai',
            error: 'Failed to download generated image URL.',
          }
        }
        b64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64')
      }
      if (!b64) {
        return {
          ok: false,
          provider: 'openai',
          error: 'OpenAI generate returned no image data.',
        }
      }
      return { ok: true, mode: 'generate', b64, model, provider: 'openai' }
    } catch (e) {
      return {
        ok: false,
        provider: 'openai',
        error: e instanceof Error ? e.message : 'Image generation request failed',
      }
    }
  },
}
