/**
 * Optional LLM polish for Admin product descriptions (HITL).
 * Template remains SSOT unless useLlm:true. Never writes catalog — Apply/Save only.
 *
 * Cousins: inventing $, stock, %, ship dates; short vs detail field length;
 * empty product name; AGENT_PRODUCT_DESCRIPTION_LLM=0; trivial no-op polish.
 */

import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  stripCodeFence,
  type AgentOpenAiUsageContext,
} from './agentOpenAiChat'
import {
  buildProductDescriptionDraft,
  productDescriptionLooksLikeInternalMeta,
  type ProductDescriptionDraftInput,
  type ProductDescriptionDraftResult,
  type ProductDescriptionField,
} from './productDescriptionDraft'

export type ProductDescriptionSource = 'template' | 'llm'

export type ProductDescriptionDraftWithSource = ProductDescriptionDraftResult & {
  source: ProductDescriptionSource
}

const MAX_SHORT = 4_000
const MAX_DETAIL = 20_000
const SECTOR_KILL = 'AGENT_PRODUCT_DESCRIPTION_LLM'

export function isProductDescriptionLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, SECTOR_KILL)
}

export function parseProductDescriptionLlmJson(
  raw: string,
  field: ProductDescriptionField
): { text: string } | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      text?: unknown
      content?: unknown
      description?: unknown
    }
    const textRaw =
      typeof parsed.text === 'string'
        ? parsed.text
        : typeof parsed.content === 'string'
          ? parsed.content
          : typeof parsed.description === 'string'
            ? parsed.description
            : ''
    const text = textRaw.trim()
    if (!text) return null
    const max = field === 'detailDescription' ? MAX_DETAIL : MAX_SHORT
    if (text.length > max) return null
    return { text }
  } catch {
    return null
  }
}

/** Reject invented commercial facts not present in the grounding blob. */
export function productDescriptionInventedCommerce(
  polished: string,
  allowedBlob: string
): boolean {
  const checks: RegExp[] = [
    /\$\s*\d/,
    /\bAUD\s*\d/i,
    /\b\d{1,3}\s*%\s*off\b/i,
    /\b\d{1,2}(?:\.\d+)?\s*%\b/,
    /\b(in stock|out of stock|ships? (in|within)|delivery in)\b/i,
    /\b\d+\s*(units?|pcs|pieces|left in stock)\b/i,
  ]
  for (const re of checks) {
    const m = polished.match(re)
    if (!m) continue
    const snippet = m[0]
    if (!allowedBlob.toLowerCase().includes(snippet.toLowerCase())) {
      // Also allow if a looser form exists in allowed (e.g. "$12" vs "$ 12")
      const compact = snippet.replace(/\s+/g, '')
      if (!allowedBlob.replace(/\s+/g, '').toLowerCase().includes(compact.toLowerCase())) {
        return true
      }
    }
  }
  return false
}

function buildSystemPrompt(field: ProductDescriptionField): string {
  const role =
    field === 'detailDescription'
      ? 'You polish a longer product detail (PDP) description for SELPIC (Australian sticker / label / print shop).'
      : 'You polish a short product listing description for SELPIC (Australian sticker / label / print shop).'
  return [
    role,
    'Return ONLY valid JSON: {"text":"..."}.',
    'Rules:',
    '- Australian English; warm, clear, non-hype tone.',
    '- Ground ONLY on product name, category, and the provided existing/template text.',
    '- NEVER invent or add price, currency amounts, stock levels, discounts/percent-off, or delivery/ship dates.',
    '- Do not invent certifications, materials, or sizes not already implied by the template/existing text.',
    '- Keep short listings concise (a few sentences). Detail pages may be longer but stay scannable.',
    '- Prefer substantive clarity; skip tiny grammar-only no-ops.',
    '- Output customer-facing storefront copy only — no admin instructions, HITL notes, or "do not invent" reminders in the text.',
    '- No markdown fences or commentary outside the JSON.',
  ].join('\n')
}

export async function polishProductDescriptionWithLlm(opts: {
  input: ProductDescriptionDraftInput
  useLlm?: boolean
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  usage?: AgentOpenAiUsageContext
}): Promise<ProductDescriptionDraftWithSource> {
  const existing = (opts.input.existingText || '').trim()
  const fresh = buildProductDescriptionDraft({
    ...opts.input,
    existingText: existing,
  })

  const base: ProductDescriptionDraftResult =
    opts.useLlm && existing
      ? { field: opts.input.field, text: existing }
      : fresh

  const asTemplate: ProductDescriptionDraftWithSource = {
    ...base,
    source: 'template',
  }

  if (!opts.useLlm) {
    return { ...fresh, source: 'template' }
  }

  if (!isProductDescriptionLlmEnabled(opts.env)) return asTemplate

  const content = await openAiChatJsonContent({
    system: buildSystemPrompt(opts.input.field),
    user: JSON.stringify(
      {
        field: opts.input.field,
        productName: opts.input.name || '',
        category: opts.input.category || '',
        templateOrExistingText: base.text,
        rules: 'Do not invent price, stock, discounts, or delivery dates.',
      },
      null,
      2
    ),
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs,
    sectorKillEnvKey: SECTOR_KILL,
    usage: opts.usage,
  })

  if (!content) return asTemplate

  const parsed = parseProductDescriptionLlmJson(content, opts.input.field)
  if (!parsed) return asTemplate

  const allowedBlob = `${opts.input.name}\n${opts.input.category || ''}\n${base.text}\n${existing}`
  if (productDescriptionInventedCommerce(parsed.text, allowedBlob)) {
    return asTemplate
  }
  if (productDescriptionLooksLikeInternalMeta(parsed.text)) {
    return asTemplate
  }

  return {
    field: opts.input.field,
    text: parsed.text,
    source: 'llm',
  }
}
