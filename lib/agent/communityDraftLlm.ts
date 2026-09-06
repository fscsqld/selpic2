/**
 * Optional LLM polish for Wave 5 community / SELPIC N drafts (HITL).
 * Template remains SSOT unless admin passes useLlm:true.
 *
 * Cousins: inventing discounts/dates/products, medical/legal/political claims,
 * branding URL duplication (footer/site chrome), Market S CTA links (keep official),
 * queue edits (polish existing title/body), AGENT_COMMUNITY_DRAFT_LLM=0.
 */

import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  stripCodeFence,
} from './agentOpenAiChat'
import {
  stripCommunitySourcesFooter,
  type CommunityDraftResult,
} from './communityDraft'

export type CommunityDraftSource = 'template' | 'llm'

export type CommunityDraftWithSource = CommunityDraftResult & {
  source: CommunityDraftSource
}

const MAX_CONTENT_CHARS = 12_000

export function isCommunityDraftLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, 'AGENT_COMMUNITY_DRAFT_LLM')
}

export function parseCommunityLlmJson(
  raw: string
): { title: string; content: string } | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      title?: unknown
      content?: unknown
      body?: unknown
    }
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const contentRaw =
      typeof parsed.content === 'string'
        ? parsed.content
        : typeof parsed.body === 'string'
          ? parsed.body
          : ''
    const content = contentRaw.trim()
    if (!title || !content) return null
    if (content.length > MAX_CONTENT_CHARS) return null
    return { title, content }
  } catch {
    return null
  }
}

/** Reject branding homepage-only URLs when template had no CTA; allow hot-goods / fundraising paths already in template. */
export function communityLlmInventedBrandingHome(content: string, allowed: string): boolean {
  const hasHome = /https?:\/\/(www\.)?selpic\.com\.au\/?\s*$/im.test(content) ||
    /https?:\/\/(www\.)?selpic\.com\.au(?![/\w-])/i.test(content)
  if (!hasHome) return false
  // If template already mentioned the apex/home URL, allow
  if (/https?:\/\/(www\.)?selpic\.com\.au/i.test(allowed)) return false
  return true
}

function buildSystemPrompt(): string {
  return [
    'You polish SELPIC N community board post drafts for Australian parents, carers, schools, kindergarten/kinder, and daycare/early learning.',
    'Return ONLY valid JSON: {"title":"...","content":"..."}.',
    'Rules:',
    '- Australian English; warm, practical, non-salesy tone suitable for a community board.',
    '- Stay grounded in the template — do not invent discounts, prices, ship dates, stock, or product names not already present.',
    '- Do not add medical, legal, or political campaign claims.',
    '- Do not append company homepage, ABN, phone, or info@ for branding — site chrome/footer covers that.',
    '- You MAY keep official CTA paths already in the template (e.g. /hot-goods, /fundraising).',
    '- Do NOT add a Sources / citations / references footer (no "---" + "Sources:" block). Source notes are admin metadata only — never copy them into content.',
    '- Prefer substantive clarity; skip tiny grammar-only tweaks.',
    '- If the template is already clear and complete, keep wording very close — do not rewrite for its own sake.',
    '- No markdown fences or commentary outside the JSON.',
  ].join('\n')
}

/**
 * Polish a community template (or queue edit) via OpenAI.
 * On any failure returns `{ ...template, source: 'template' }`.
 */
export async function polishCommunityDraftWithLlm(opts: {
  template: CommunityDraftResult
  useLlm?: boolean
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}): Promise<CommunityDraftWithSource> {
  const cleanedTemplate: CommunityDraftResult = {
    ...opts.template,
    content: stripCommunitySourcesFooter(opts.template.content),
  }
  const templateWithSource: CommunityDraftWithSource = {
    ...cleanedTemplate,
    source: 'template',
  }

  if (!opts.useLlm) return templateWithSource
  if (!isCommunityDraftLlmEnabled(opts.env)) return templateWithSource

  const content = await openAiChatJsonContent({
    system: buildSystemPrompt(),
    user: JSON.stringify(
      {
        topicId: cleanedTemplate.topicId,
        category: cleanedTemplate.category,
        // Do not send sources array — models often append them as a Sources footer.
        templateTitle: cleanedTemplate.title,
        templateContent: cleanedTemplate.content,
      },
      null,
      2
    ),
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs,
    sectorKillEnvKey: 'AGENT_COMMUNITY_DRAFT_LLM',
  })

  if (!content) return templateWithSource

  const parsed = parseCommunityLlmJson(content)
  if (!parsed) return templateWithSource

  const allowedBlob = `${cleanedTemplate.title}\n${cleanedTemplate.content}`
  if (communityLlmInventedBrandingHome(parsed.content, allowedBlob)) {
    return templateWithSource
  }

  return {
    ...cleanedTemplate,
    title: parsed.title,
    content: stripCommunitySourcesFooter(parsed.content),
    source: 'llm',
  }
}
