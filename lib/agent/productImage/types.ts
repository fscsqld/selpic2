/**
 * Product image AI provider contract (HITL).
 * UI / Media / Apply / Save stay provider-blind — see docs/agent-product-image-providers-design.md.
 */

export type ProductImageProviderId = 'openai' | 'google'

export type ProductImageGenSuccess = {
  ok: true
  mode: 'edit' | 'generate'
  b64: string
  model: string
  provider: ProductImageProviderId
}

export type ProductImageGenFailure = {
  ok: false
  error: string
  provider?: ProductImageProviderId
}

export type ProductImageGenResult = ProductImageGenSuccess | ProductImageGenFailure

export type ProductImageGenerateOpts = {
  prompt: string
  sourceImageUrl?: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}

export type ProductImageProvider = {
  id: ProductImageProviderId
  isConfigured(env?: NodeJS.ProcessEnv): boolean
  generateOrEdit(opts: ProductImageGenerateOpts): Promise<ProductImageGenResult>
}

export const AGENT_PRODUCT_IMAGE_GEN_KILL = 'AGENT_PRODUCT_IMAGE_GEN'
export const AGENT_IMAGE_PROVIDER_ENV = 'AGENT_IMAGE_PROVIDER'

/** Master kill for all product image providers (OpenAI + Google). */
export function isProductImageMasterKill(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env[AGENT_PRODUCT_IMAGE_GEN_KILL]
  return v === '0' || v === 'false'
}
