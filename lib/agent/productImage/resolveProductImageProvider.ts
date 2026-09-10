/**
 * Resolve product image AI provider from env and optional per-request override (W2.5).
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
    `[productImage] Unknown provider=${raw}; falling back to openai`
  )
  return 'openai'
}

export type ProductImageProviderAvailability = {
  masterKill: boolean
  defaultProvider: ProductImageProviderId
  openai: { configured: boolean }
  google: { configured: boolean }
}

/** Status for Admin UI picker — no secrets. */
export function getProductImageProviderAvailability(
  env: NodeJS.ProcessEnv = process.env
): ProductImageProviderAvailability {
  return {
    masterKill: isProductImageMasterKill(env),
    defaultProvider: parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV]),
    openai: { configured: openaiProductImageProvider.isConfigured(env) },
    google: { configured: googleGeminiImageProvider.isConfigured(env) },
  }
}

/**
 * Active provider. `preferred` (from UI body) wins when non-empty; else env default.
 */
export function resolveProductImageProvider(
  env: NodeJS.ProcessEnv = process.env,
  preferred?: string | null
): ProductImageProvider | { id: ProductImageProviderId; missing: true; error: string } {
  if (isProductImageMasterKill(env)) {
    const id =
      preferred != null && String(preferred).trim() !== ''
        ? parseProductImageProviderId(preferred)
        : parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV])
    return {
      id,
      missing: true,
      error:
        'Product image AI is disabled (AGENT_PRODUCT_IMAGE_GEN=0). Remove the kill switch to enable.',
    }
  }

  const id =
    preferred != null && String(preferred).trim() !== ''
      ? parseProductImageProviderId(preferred)
      : parseProductImageProviderId(env[AGENT_IMAGE_PROVIDER_ENV])
  const provider = PROVIDERS[id]

  if (!provider.isConfigured(env)) {
    if (id === 'google') {
      return {
        id: 'google',
        missing: true,
        error:
          'Google product image AI needs GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY). Choose OpenAI, or add the Gemini key.',
      }
    }
    return {
      id: 'openai',
      missing: true,
      error:
        'OpenAI product image AI needs OPENAI_API_KEY (and AGENT_DRAFT_LLM must not be 0). Choose Google if configured, or fix OpenAI env.',
    }
  }
  return provider
}

/** True if at least one image provider can run (usage hub). */
export function isAnyProductImageProviderConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (isProductImageMasterKill(env)) return false
  return (
    openaiProductImageProvider.isConfigured(env) ||
    googleGeminiImageProvider.isConfigured(env)
  )
}
