/**
 * HITL product imagery Vision review + photo brief (no catalog writes, no auto-upload).
 *
 * Cousins: non-https images, AGENT_PRODUCT_IMAGERY_LLM=0, invented prices in briefs,
 * Vision timeouts, empty checklist JSON.
 */

import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  openAiVisionJsonContent,
  stripCodeFence,
} from './agentOpenAiChat'

export const AGENT_PRODUCT_IMAGERY_LLM_KILL = 'AGENT_PRODUCT_IMAGERY_LLM'

export type ProductImageryAssistMode = 'vision_review' | 'photo_brief'

export type ProductImageryAssistResult = {
  mode: ProductImageryAssistMode
  source: 'template' | 'llm'
  title: string
  checklist: string[]
  notes?: string
}

export function isProductImageryLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, AGENT_PRODUCT_IMAGERY_LLM_KILL)
}

export function isHttpsImageUrl(url: string): boolean {
  return /^https:\/\//i.test((url || '').trim())
}

export function buildPhotoBriefTemplate(input: {
  name: string
  category?: string
}): ProductImageryAssistResult {
  const name = (input.name || '').trim() || 'this product'
  const category = (input.category || '').trim() || 'stickers / labels'
  return {
    mode: 'photo_brief',
    source: 'template',
    title: `Photo brief — ${name}`,
    checklist: [
      `Shoot ${name} on a clean, neutral surface with soft even light (no harsh shadows).`,
      'Fill the frame with the product; leave a small clear margin for crop on PDP and cards.',
      'Show true colours and print detail; avoid filters that change ink appearance.',
      `Include one lifestyle or in-use angle if it helps parents understand ${category} use.`,
      'Export a sharp JPEG/WebP suitable for web; upload via Media Library (https URL only).',
      'Do not invent promotional prices, stock counts, or ship dates in any overlay text.',
    ],
    notes:
      'Template brief only — human uploads the real photo. Nothing is written to the catalog until Save.',
  }
}

export function parseImageryAssistJson(
  raw: string,
  mode: ProductImageryAssistMode
): { title: string; checklist: string[]; notes?: string } | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      title?: unknown
      checklist?: unknown
      notes?: unknown
      items?: unknown
    }
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim().slice(0, 160)
        : mode === 'vision_review'
          ? 'Imagery review'
          : 'Photo brief'
    const listRaw = Array.isArray(parsed.checklist)
      ? parsed.checklist
      : Array.isArray(parsed.items)
        ? parsed.items
        : []
    const checklist = listRaw
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .slice(0, 10)
    if (!checklist.length) return null
    const notes =
      typeof parsed.notes === 'string' && parsed.notes.trim()
        ? parsed.notes.trim().slice(0, 800)
        : undefined
    return { title, checklist, notes }
  } catch {
    return null
  }
}

function inventsCommerce(text: string): boolean {
  return /\$\s*\d|\bAUD\s*\d|\b\d+\s*%\s*off\b|\bin stock\b|\bships? (in|within)\b/i.test(
    text
  )
}

export async function runProductImageryAssist(opts: {
  mode: ProductImageryAssistMode
  name: string
  category?: string
  imageUrl?: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  useLlm?: boolean
}): Promise<ProductImageryAssistResult> {
  const template = buildPhotoBriefTemplate({
    name: opts.name,
    category: opts.category,
  })

  if (opts.mode === 'photo_brief' && opts.useLlm !== true) {
    return template
  }

  if (opts.useLlm !== true || !isProductImageryLlmEnabled(opts.env)) {
    if (opts.mode === 'vision_review') {
      return {
        mode: 'vision_review',
        source: 'template',
        title: 'Imagery checklist (AI unavailable)',
        checklist: [
          'Confirm the primary image is an https URL (not indexeddb:// or data:).',
          'Check crop: product fills the frame without cutting key artwork.',
          'Check lighting and colour accuracy for print products.',
          'Add a second angle or lifestyle shot in Image Management if the listing feels thin.',
          'Save the product only after a human-approved upload.',
        ],
        notes: 'Vision polish skipped — template checklist only.',
      }
    }
    return template
  }

  if (opts.mode === 'vision_review') {
    const imageUrl = (opts.imageUrl || '').trim()
    if (!isHttpsImageUrl(imageUrl)) {
      return {
        mode: 'vision_review',
        source: 'template',
        title: 'Cannot run Vision — need https image',
        checklist: [
          'Upload a product image via Media Library so the URL starts with https://.',
          'indexeddb:// and data: URLs will not sync or run Vision review.',
          'Then click Review with Vision again.',
        ],
      }
    }

    const system = [
      'You review a single SELPIC storefront product photo for an Australian sticker/label shop.',
      'Return JSON only: { "title": string, "checklist": string[], "notes"?: string }.',
      'checklist: 4–8 short actionable HITL steps (crop, lighting, background, alternate angle).',
      'Never invent prices, discounts, stock, or ship dates.',
      'Never say the image was uploaded or published — admin must upload manually.',
      'Do not rewrite homepage Hero or suggest auto-replacing the catalog image.',
    ].join(' ')

    const userText = [
      `Product name: ${(opts.name || '').trim() || 'Unknown'}`,
      `Category: ${(opts.category || '').trim() || 'n/a'}`,
      'Review the attached image and give a practical improvement checklist.',
    ].join('\n')

    const raw = await openAiVisionJsonContent({
      system,
      userText,
      imageUrl,
      env: opts.env,
      fetchImpl: opts.fetchImpl,
      sectorKillEnvKey: AGENT_PRODUCT_IMAGERY_LLM_KILL,
    })
    const parsed = raw ? parseImageryAssistJson(raw, 'vision_review') : null
    if (!parsed) {
      return {
        mode: 'vision_review',
        source: 'template',
        title: 'Imagery checklist (Vision failed)',
        checklist: [
          'Retry Review with Vision, or follow the photo brief template.',
          'Verify the https image URL is publicly reachable.',
        ],
        notes: 'Model response missing or invalid JSON.',
      }
    }
    const blob = `${parsed.title}\n${parsed.checklist.join('\n')}\n${parsed.notes || ''}`
    if (inventsCommerce(blob)) {
      return {
        mode: 'vision_review',
        source: 'template',
        title: 'Imagery checklist (commerce claims blocked)',
        checklist: template.checklist.slice(0, 5),
        notes: 'Model suggested commercial claims — template kept.',
      }
    }
    return {
      mode: 'vision_review',
      source: 'llm',
      title: parsed.title,
      checklist: parsed.checklist,
      notes: parsed.notes,
    }
  }

  // photo_brief + LLM
  const system = [
    'You write a short product photography brief for SELPIC (AU sticker/label shop).',
    'Return JSON only: { "title": string, "checklist": string[], "notes"?: string }.',
    'checklist: 5–8 concrete shot instructions. No prices, stock, or ship dates.',
    'Admin will shoot/upload manually — do not claim images were generated or published.',
  ].join(' ')
  const user = [
    `Product: ${(opts.name || '').trim() || 'Unknown'}`,
    `Category: ${(opts.category || '').trim() || 'n/a'}`,
    'Write a practical photo brief checklist.',
  ].join('\n')

  const raw = await openAiChatJsonContent({
    system,
    user,
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    sectorKillEnvKey: AGENT_PRODUCT_IMAGERY_LLM_KILL,
  })
  const parsed = raw ? parseImageryAssistJson(raw, 'photo_brief') : null
  if (!parsed) return template
  const blob = `${parsed.title}\n${parsed.checklist.join('\n')}\n${parsed.notes || ''}`
  if (inventsCommerce(blob)) return template
  return {
    mode: 'photo_brief',
    source: 'llm',
    title: parsed.title,
    checklist: parsed.checklist,
    notes: parsed.notes,
  }
}
