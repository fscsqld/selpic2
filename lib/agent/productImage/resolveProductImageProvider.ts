/**
 * Resolve product image AI provider from env.
 * Unknown ids fall back to openai (never crash).
 */

import { googleGeminiImageProvider } from './googleGeminiImage'
import { openaiProductImageProvider } from './openaiImagesProvider'
import {
  AGENT_IMAGE_PROVIDER_ENV,
  isProductImageMasterKill,
  type ProductImageProvider,
  type ProductImageProviderId,
} from './types'

export { isProductImageMasterKill } from './types'

const PROVIDERS: Record<ProductImageProviderId, ProductImageProvider> = {
  openai: openaiProductImageProvider,
  google: googleGeminiImageProvider,
}

export function parseProductImageProviderId(
  raw: string | undefined
): ProductImageProviderId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'google') return 'google'
  if (v === 'openai' || !v) return 'openai'
  console.warn(
    `[productImage] Unknown ${AGENT_IMAGE_PROVIDER_ENV}=${raw}; falling back to openai`
  )
  return 'openai'
}

/**
 * Active provider for this process.
 */
export function resolveProductImageProvider(
  env: NodeJS.ProcessEnv = process.env
): ProductImageProvider | { id: ProductImageProviderId; missing: true; error: string } {
  if (isProductImageMasterKill(env)) {
    return {
      id: parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV]),
      missing: true,
      error:
        'Product image AI is disabled (AGENT_PRODUCT_IMAGE_GEN=0). Remove the kill switch to enable.',
    }
  }

  const id = parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV])
  const provider = PROVIDERS[id]

  if (!provider.isConfigured(env)) {
    if (id === 'google') {
      return {
        id: 'google',
        missing: true,
        error:
          'Google product image AI needs GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY). Or set AGENT_IMAGE_PROVIDER=openai.',
      }
    }
    return {
      id: 'openai',
      missing: true,
      error:
        'Product image AI is disabled (set OPENAI_API_KEY and do not set AGENT_PRODUCT_IMAGE_GEN=0). AGENT_DRAFT_LLM=0 also disables the OpenAI image path.',
    }
  }
  return provider
}
