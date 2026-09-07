/**
 * Optional LLM polish for newsletter campaign drafts (HITL).
 * Template remains SSOT unless useLlm:true. Never sends email.
 *
 * Cousins: inventing $/%/stock/ship dates; mixing fundraising outreach;
 * AGENT_NEWSLETTER_DRAFT_LLM=0; trivial no-op polish; HTML injection.
 */

import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  stripCodeFence,
  type AgentOpenAiUsageContext,
} from './agentOpenAiChat'
import {
  buildNewsletterCampaignDraft,
  newsletterDraftLooksLikeInternalMeta,
  type NewsletterDraftInput,
  type NewsletterDraftResult,
} from './newsletterDraft'

export type NewsletterDraftSource = 'template' | 'llm'

export type NewsletterDraftWithSource = NewsletterDraftResult & {
  source: NewsletterDraftSource
}

const MAX_SUBJECT = 200
const MAX_MESSAGE = 12_000
const SECTOR_KILL = 'AGENT_NEWSLETTER_DRAFT_LLM'

export function isNewsletterDraftLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, SECTOR_KILL)
}

export function parseNewsletterDraftLlmJson(
  raw: string
): { subject: string; message: string } | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      subject?: unknown
      message?: unknown
      body?: unknown
    }
    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
    const message =
      typeof parsed.message === 'string'
        ? parsed.message.trim()
        : typeof parsed.body === 'string'
          ? parsed.body.trim()
          : ''
    if (!subject || !message) return null
    if (subject.length > MAX_SUBJECT || message.length > MAX_MESSAGE) return null
    return { subject, message }
  } catch {
    return null
  }
}

/** Reject invented commercial facts not present in the grounding blob. */
export function newsletterDraftInventedCommerce(
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
      const compact = snippet.replace(/\s+/g, '')
      if (!allowedBlob.replace(/\s+/g, '').toLowerCase().includes(compact.toLowerCase())) {
        return true
      }
    }
  }
  return false
}

function buildSystemPrompt(): string {
  return [
    'You polish SELPIC newsletter campaign drafts for Australian consumer subscribers (families, carers).',
    'AU English. Warm, clear, short paragraphs. Plain text email body (no HTML).',
    'Keep unsubscribe/store URLs if present. Do not invent prices, discounts, stock, ship dates, or promo codes.',
    'Do not target schools as outreach — this is not fundraising. Do not mention outreach_targets.',
    'Do not change homepage Hero or invent community posts.',
    'Return JSON only: {"subject":"...","message":"..."}',
  ].join(' ')
}

/**
 * Polish a newsletter template (or edited draft) via OpenAI.
 * Falls back to template on any failure / invent / meta leak.
 */
export async function polishNewsletterDraftWithLlm(
  input: NewsletterDraftInput & {
    existingSubject?: string
    existingMessage?: string
  },
  opts?: {
    env?: NodeJS.ProcessEnv
    fetchImpl?: typeof fetch
    usage?: AgentOpenAiUsageContext
  }
): Promise<NewsletterDraftWithSource> {
  const template = buildNewsletterCampaignDraft(input)
  const base: NewsletterDraftResult = {
    ...template,
    subject: (input.existingSubject || '').trim() || template.subject,
    message: (input.existingMessage || '').trim() || template.message,
  }

  const env = opts?.env ?? process.env
  if (!isNewsletterDraftLlmEnabled(env)) {
    return { ...base, source: 'template' }
  }

  const allowedBlob = [
    base.subject,
    base.message,
    input.sourceNotes || '',
    input.customBrief || '',
  ].join('\n')

  const raw = await openAiChatJsonContent({
    system: buildSystemPrompt(),
    user: JSON.stringify({
      topicId: base.topicId,
      type: base.type,
      subject: base.subject,
      message: base.message,
      sourceNotes: input.sourceNotes || '',
      customBrief: input.customBrief || '',
    }),
    env,
    fetchImpl: opts?.fetchImpl,
    sectorKillEnvKey: SECTOR_KILL,
    temperature: 0.35,
    usage: opts?.usage,
  })

  if (!raw) return { ...base, source: 'template' }
  const parsed = parseNewsletterDraftLlmJson(raw)
  if (!parsed) return { ...base, source: 'template' }

  const polishedBlob = `${parsed.subject}\n${parsed.message}`
  if (newsletterDraftLooksLikeInternalMeta(polishedBlob)) {
    return { ...base, source: 'template' }
  }
  if (newsletterDraftInventedCommerce(polishedBlob, allowedBlob)) {
    return { ...base, source: 'template' }
  }

  // Trivial no-op — keep template source label.
  if (
    parsed.subject === base.subject &&
    parsed.message.replace(/\s+/g, ' ') === base.message.replace(/\s+/g, ' ')
  ) {
    return { ...base, source: 'template' }
  }

  return {
    ...base,
    subject: parsed.subject,
    message: parsed.message,
    source: 'llm',
  }
}

export async function buildNewsletterDraftWithOptionalLlm(
  input: NewsletterDraftInput & {
    useLlm?: boolean
    existingSubject?: string
    existingMessage?: string
  },
  opts?: {
    env?: NodeJS.ProcessEnv
    fetchImpl?: typeof fetch
    usage?: AgentOpenAiUsageContext
  }
): Promise<NewsletterDraftWithSource> {
  if (input.useLlm) {
    return polishNewsletterDraftWithLlm(input, opts)
  }
  const draft = buildNewsletterCampaignDraft(input)
  const subject = (input.existingSubject || '').trim()
  const message = (input.existingMessage || '').trim()
  if (subject && message) {
    return { ...draft, subject, message, source: 'template' }
  }
  return { ...draft, source: 'template' }
}
