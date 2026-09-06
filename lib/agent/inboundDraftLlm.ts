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

export type InboundDraftSource = 'template' | 'llm'

export type InboundDraftWithSource = InboundDraftResult & {
  source: InboundDraftSource
}

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = 12_000
const MAX_BODY_CHARS = 8_000

export function isInboundDraftLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.AGENT_INBOUND_DRAFT_LLM === '0' || env.AGENT_INBOUND_DRAFT_LLM === 'false') {
    return false
  }
  return Boolean(env.OPENAI_API_KEY?.trim())
}

function stripCodeFence(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return (m?.[1] ?? t).trim()
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
      // Normalize ORD-5512 vs ORD5512
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
    '- Stay grounded in the customer excerpt and template — do not invent order numbers, tracking numbers, refund amounts, ship dates, or stock levels.',
    '- Do not promise a refund, replacement, or free product unless the template already does.',
    '- For payment/billing intents: never ask for full card numbers; keep careful wording.',
    '- You may tighten wording and ask one clear clarifying question when helpful.',
    '- Do not include markdown fences or commentary outside the JSON.',
  ].join('\n')
}

function buildUserPrompt(template: InboundDraftResult, input: InboundDraftInput): string {
  return JSON.stringify(
    {
      channel: input.channel,
      intentHint: template.intentHint,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerSubject: input.subject || '',
      customerExcerpt: (input.bodyExcerpt || '').slice(0, 2500),
      templateSubject: template.subject,
      templateBody: template.body,
    },
    null,
    2
  )
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

/**
 * Polish a template draft via OpenAI Chat Completions.
 * Requires explicit `useLlm: true` (admin button) plus a configured API key.
 * On any failure returns `{ ...template, source: 'template' }`.
 */
export async function polishInboundReplyDraftWithLlm(opts: {
  template: InboundDraftResult
  input: InboundDraftInput
  /** Opt-in only — never call OpenAI unless the admin requested polish. */
  useLlm?: boolean
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}): Promise<InboundDraftWithSource> {
  const env = opts.env ?? process.env
  const templateWithSource: InboundDraftWithSource = { ...opts.template, source: 'template' }

  if (!opts.useLlm) return templateWithSource
  if (!isInboundDraftLlmEnabled(env)) return templateWithSource

  const apiKey = env.OPENAI_API_KEY!.trim()
  const model = (env.AGENT_INBOUND_DRAFT_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = opts.fetchImpl ?? fetch

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(opts.template, opts.input) },
        ],
      }),
    })

    if (!res.ok) return templateWithSource

    const json = (await res.json()) as ChatCompletionResponse
    const content = json.choices?.[0]?.message?.content
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
  } catch {
    return templateWithSource
  } finally {
    clearTimeout(timer)
  }
}
