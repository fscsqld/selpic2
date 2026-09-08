/**
 * Resolve product image AI provider from env.
 * Unknown ids fall back to openai (never crash). Google adapter lands in W2.
 */

import { openaiProductImageProvider } from './openaiImagesProvider'
import {
  AGENT_IMAGE_PROVIDER_ENV,
  AGENT_PRODUCT_IMAGE_GEN_KILL,
  type ProductImageProvider,
  type ProductImageProviderId,
} from './types'

const PROVIDERS: Record<'openai', ProductImageProvider> = {
  openai: openaiProductImageProvider,
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

export function isProductImageMasterKill(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env[AGENT_PRODUCT_IMAGE_GEN_KILL]
  return v === '0' || v === 'false'
}

/**
 * Active provider for this process. Google is recognized but not registered until W2.
 */
export function resolveProductImageProvider(
  env: NodeJS.ProcessEnv = process.env
): ProductImageProvider | { id: ProductImageProviderId; missing: true; error: string } {
  if (isProductImageMasterKill(env)) {
    return {
      id: 'openai',
      missing: true,
      error:
        'Product image AI is disabled (AGENT_PRODUCT_IMAGE_GEN=0). Remove the kill switch to enable.',
    }
  }

  const id = parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV])

  if (id === 'google') {
    return {
      id: 'google',
      missing: true,
      error:
        'Google product image provider is not enabled yet. Set AGENT_IMAGE_PROVIDER=openai (default) or wait for W2.',
    }
  }

  const provider = PROVIDERS.openai
  if (!provider.isConfigured(env)) {
    return {
      id: 'openai',
      missing: true,
      error:
        'Product image AI is disabled (set OPENAI_API_KEY and do not set AGENT_PRODUCT_IMAGE_GEN=0).',
    }
  }
  return provider
}
