/**
 * Optional LLM polish for Fundraising Needs follow-up drafts (HITL).
 * Template remains SSOT unless admin passes useLlm:true.
 * Never auto-sends — Send follow-up stays human-confirmed.
 *
 * Cousins: dropped apply URL / target_id, dropped "Hi," greeting (learned 2026-09:
 * model often strips greeting as a no-op polish), invented cashback %, branding
 * homepage without /fundraising CTA, ABN/info@ duplication, trivial near-identical
 * rewrites that still bill tokens, AGENT_FUNDRAISING_DRAFT_LLM=0, polishing an
 * already-edited editor body vs fresh template.
 * Do not ship admin “practice reply” demo cards — empty-queue copy is enough;
 * polish UI belongs only on real open reply cards (learned 2026-09).
 * Admin empty-state / section help: one short sentence — no SQL/setup essays,
 * no repeated Polish/intent taxonomy in the blank state (learned 2026-09).
 */

import {
  isAgentOpenAiEnabled,
  openAiChatJsonContent,
  stripCodeFence,
} from '../agent/agentOpenAiChat'
import type { OutreachReplyIntent } from './outreachReplyClassify'
import { buildOutreachFollowUpDraft } from './outreachReplyDraft'

export type OutreachFollowUpDraft = {
  subject: string
  text: string
}

export type OutreachDraftSource = 'template' | 'llm'

export type OutreachFollowUpDraftWithSource = OutreachFollowUpDraft & {
  source: OutreachDraftSource
}

export type OutreachDraftPolishInput = {
  subject: string
  organizationName?: string
  targetId?: string
  intent: OutreachReplyIntent
  /** Customer reply excerpt (grounding). */
  excerpt?: string
  /** Current editor subject/body when polishing an edit. */
  existingSubject?: string
  existingText?: string
}

const MAX_TEXT_CHARS = 8_000
const SECTOR_KILL = 'AGENT_FUNDRAISING_DRAFT_LLM'

export function isFundraisingDraftLlmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isAgentOpenAiEnabled(env, SECTOR_KILL)
}

export function parseOutreachLlmJson(
  raw: string
): OutreachFollowUpDraft | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      subject?: unknown
      text?: unknown
      body?: unknown
    }
    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
    const textRaw =
      typeof parsed.text === 'string'
        ? parsed.text
        : typeof parsed.body === 'string'
          ? parsed.body
          : ''
    const text = textRaw.trim()
    if (!subject || !text) return null
    if (text.length > MAX_TEXT_CHARS) return null
    if (!/kind regards/i.test(text)) return null
    // Fundraising templates always open with Hi, — reject drops (common LLM no-op).
    if (!/^\s*Hi,/i.test(text)) return null
    return { subject, text }
  } catch {
    return null
  }
}

/** Reject polish that drops template apply / tracking URLs. */
export function outreachLlmDroppedApplyUrl(
  polished: string,
  templateText: string
): boolean {
  const urls = templateText.match(/https?:\/\/[^\s<>"]+/gi) || []
  for (const u of urls) {
    if (!polished.includes(u)) return true
  }
  return false
}

/** Reject when template had Hi, but polish removed it (learned practice sample). */
export function outreachLlmDroppedGreeting(
  polished: string,
  templateText: string
): boolean {
  if (!/^\s*Hi,/i.test(templateText)) return false
  return !/^\s*Hi,/i.test(polished)
}

/**
 * Reject near-identical polish (e.g. only dropped Hi, / whitespace).
 * Cousin of community "tiny polish still bills tokens" — keep template instead.
 */
export function outreachLlmTrivialChange(
  polished: string,
  templateText: string
): boolean {
  const norm = (s: string) =>
    s
      .replace(/^\s*Hi,\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  return norm(polished) === norm(templateText)
}

/** Reject invented cashback / commission percentages not already in template or excerpt. */
export function outreachLlmInventedPercent(
  polished: string,
  allowedBlob: string
): boolean {
  const found = polished.match(/\b\d{1,2}(?:\.\d+)?\s*%/g) || []
  for (const raw of found) {
    const norm = raw.replace(/\s+/g, '')
    if (!allowedBlob.includes(norm) && !allowedBlob.includes(raw.trim())) {
      return true
    }
  }
  return false
}

/** Reject branding contact lines that belong in email footer, not follow-up body. */
export function outreachLlmInventedBrandingContact(
  polished: string,
  templateText: string
): boolean {
  const checks = [
    /info@selpic\.com\.au/i,
    /\bABN\b/i,
    /https?:\/\/(www\.)?selpic\.com\.au\/?\s*$/im,
  ]
  for (const re of checks) {
    if (re.test(polished) && !re.test(templateText)) return true
  }
  return false
}

function buildSystemPrompt(): string {
  return [
    'You polish SELPIC Fundraising follow-up email drafts for Australian schools, kindergartens, daycare, and community organisations.',
    'Return ONLY valid JSON: {"subject":"...","text":"..."}.',
    'Rules:',
    '- Australian English; warm, professional B2B tone.',
    '- MUST keep the opening line exactly as "Hi," on its own line (never drop or replace the greeting).',
    '- Keep sign-off exactly: Kind regards, then SELPIC Fundraising.',
    '- ALWAYS keep every https URL from the template unchanged (apply link + tracking params).',
    '- Do not invent cashback %, commission, prices, deadlines, or stock.',
    '- Do not append company homepage alone, ABN, phone, or info@ — email footer covers branding.',
    '- Stay grounded in the customer excerpt and template; answer questions without over-promising.',
    '- Only change wording when it clearly improves clarity for the customer reply. Do not strip greetings or make tiny no-op edits.',
    '- If the template is already clear and complete, return it almost unchanged — still keep Hi, and the apply URL.',
    '- No markdown fences or commentary outside the JSON.',
  ].join('\n')
}

/**
 * Polish a Needs-reply follow-up via OpenAI.
 * On any failure returns `{ ...template, source: 'template' }`.
 */
export async function polishOutreachFollowUpDraftWithLlm(opts: {
  input: OutreachDraftPolishInput
  useLlm?: boolean
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}): Promise<OutreachFollowUpDraftWithSource> {
  const fresh = buildOutreachFollowUpDraft({
    subject: opts.input.subject,
    organizationName: opts.input.organizationName,
    targetId: opts.input.targetId,
    intent: opts.input.intent,
  })

  const existingSubject = (opts.input.existingSubject || '').trim()
  const existingText = (opts.input.existingText || '').trim()
  const base: OutreachFollowUpDraft =
    opts.useLlm && existingSubject && existingText
      ? { subject: existingSubject, text: existingText }
      : fresh

  const templateWithSource: OutreachFollowUpDraftWithSource = {
    ...base,
    source: 'template',
  }

  // Regenerate template (useLlm false) always returns the fresh SSOT template.
  if (!opts.useLlm) {
    return { ...fresh, source: 'template' }
  }

  if (!isFundraisingDraftLlmEnabled(opts.env)) return templateWithSource

  const content = await openAiChatJsonContent({
    system: buildSystemPrompt(),
    user: JSON.stringify(
      {
        intent: opts.input.intent,
        organizationName: opts.input.organizationName || '',
        targetId: opts.input.targetId || '',
        customerSubject: opts.input.subject || '',
        customerExcerpt: (opts.input.excerpt || '').slice(0, 2500),
        templateSubject: base.subject,
        templateText: base.text,
        mustKeepGreeting: 'Hi,',
      },
      null,
      2
    ),
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs,
    sectorKillEnvKey: SECTOR_KILL,
  })

  if (!content) return templateWithSource

  const parsed = parseOutreachLlmJson(content)
  if (!parsed) return templateWithSource

  // Apply URL must match the fresh template (canonical tracking), even when polishing edits.
  if (outreachLlmDroppedApplyUrl(parsed.text, fresh.text)) {
    return templateWithSource
  }
  if (outreachLlmDroppedGreeting(parsed.text, base.text)) {
    return templateWithSource
  }
  if (outreachLlmTrivialChange(parsed.text, base.text)) {
    return templateWithSource
  }
  const allowedBlob = `${fresh.text}\n${base.text}\n${opts.input.excerpt || ''}`
  if (outreachLlmInventedPercent(parsed.text, allowedBlob)) {
    return templateWithSource
  }
  if (outreachLlmInventedBrandingContact(parsed.text, fresh.text)) {
    return templateWithSource
  }

  return {
    subject: parsed.subject,
    text: parsed.text,
    source: 'llm',
  }
}
