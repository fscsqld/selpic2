/**
 * Optional LLM polish for Wave 3 inbound drafts (HITL).
 * Template remains SSOT when the key is missing, LLM is off, or the call fails.
 * Never auto-sends — draft API only returns editable text.
 *
 * Cousins: timeout, malformed JSON, invented order refs / refunds, empty body,
 * AGENT_INBOUND_DRAFT_LLM=0 kill switch, bespoke vs message channel, intentOverride,
 * admin must pass useLlm:true (queue select / intent change stay template-only — cost).
 */

import type { InboundDraftInput, InboundDraftResult } from './inboundDraft'
import { extractOrderRefHint } from './inboundDraft'
import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  stripCodeFence,
  type AgentOpenAiUsageContext,
} from './agentOpenAiChat'

export type InboundDraftSource = 'template' | 'llm'

export type InboundDraftWithSource = InboundDraftResult & {
  source: InboundDraftSource
}

const MAX_BODY_CHARS = 8_000

export function isInboundDraftLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, 'AGENT_INBOUND_DRAFT_LLM')
}

function collectAllowedOrderRefs(parts: string[]): Set<string> {
  const set = new Set<string>()
  for (const p of parts) {
    const ref = extractOrderRefHint(p)
    if (ref) set.add(ref.toUpperCase())
  }
  return set
}

/** Reject drafts that invent ORD- style refs not present in template or customer text. */
export function llmDraftInventedOrderRef(
  body: string,
  allowed: Set<string>
): string | undefined {
  const found = body.match(/\bORD[-_\s]?\d{3,}\b/gi) || []
  for (const raw of found) {
    const norm = raw.replace(/\s+/g, '').toUpperCase()
    if (!allowed.has(norm) && ![...allowed].some((a) => a === norm)) {
      const compact = norm.replace(/[_-]/g, '')
      const ok = [...allowed].some((a) => a.replace(/[_-]/g, '') === compact)
      if (!ok) return raw
    }
  }
  return undefined
}

export function parseLlmDraftJson(raw: string): { subject: string; body: string } | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      subject?: unknown
      body?: unknown
    }
    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!subject || !body) return null
    if (body.length > MAX_BODY_CHARS) return null
    if (!/^dear\b/i.test(body) && !body.includes(',')) return null
    return { subject, body }
  } catch {
    return null
  }
}

function buildSystemPrompt(): string {
  return [
    'You polish first-line customer care email drafts for SELPIC (Australian sticker / label shop).',
    'Return ONLY valid JSON: {"subject":"...","body":"..."}.',
    'Rules:',
    '- Keep Australian English and a warm, professional tone.',
    '- Keep the greeting (Dear …) and sign-off (Kind regards, Selpic Customer Care).',
    '- Do not append the company website, ABN, phone, or info@ email in the body — the transactional email footer already includes them.',
    '- Stay grounded in the customer excerpt and template — do not invent order numbers, tracking numbers, refund amounts, ship dates, or stock levels.',
    '- Do not promise a refund, replacement, or free product unless the template already does.',
    '- For payment/billing intents: never ask for full card numbers; keep careful wording.',
    '- You may tighten wording and ask one clear clarifying question when helpful.',
    '- Prefer substantive help (tone, clarity, multi-issue replies). Do not waste tokens on tiny grammar-only tweaks the template already covers.',
    '- Do not include markdown fences or commentary outside the JSON.',
  ].join('\n')
}

/**
 * Polish a template draft via OpenAI Chat Completions.
 * Requires explicit `useLlm: true` (admin button) plus a configured API key.
 * On any failure returns `{ ...template, source: 'template' }`.
 */
export async function polishInboundReplyDraftWithLlm(opts: {
  template: InboundDraftResult
  input: InboundDraftInput
  useLlm?: boolean
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  usage?: AgentOpenAiUsageContext
}): Promise<InboundDraftWithSource> {
  const templateWithSource: InboundDraftWithSource = { ...opts.template, source: 'template' }

  if (!opts.useLlm) return templateWithSource
  if (!isInboundDraftLlmEnabled(opts.env)) return templateWithSource

  const content = await openAiChatJsonContent({
    system: buildSystemPrompt(),
    user: JSON.stringify(
      {
        channel: opts.input.channel,
        intentHint: opts.template.intentHint,
        customerName: opts.input.customerName,
        customerEmail: opts.input.customerEmail,
        customerSubject: opts.input.subject || '',
        customerExcerpt: (opts.input.bodyExcerpt || '').slice(0, 2500),
        templateSubject: opts.template.subject,
        templateBody: opts.template.body,
      },
      null,
      2
    ),
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs,
    sectorKillEnvKey: 'AGENT_INBOUND_DRAFT_LLM',
    usage: opts.usage,
  })

  if (!content) return templateWithSource

  const parsed = parseLlmDraftJson(content)
  if (!parsed) return templateWithSource

  const allowedFromSource = collectAllowedOrderRefs([
    opts.template.body,
    opts.template.subject,
    opts.input.bodyExcerpt || '',
    opts.input.subject || '',
  ])
  if (llmDraftInventedOrderRef(parsed.body, allowedFromSource)) {
    return templateWithSource
  }

  return {
    subject: parsed.subject,
    body: parsed.body,
    intentHint: opts.template.intentHint,
    source: 'llm',
  }
}
