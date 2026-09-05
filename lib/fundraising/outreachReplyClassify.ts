/**
 * Classify fundraising outreach email replies (not CS inbound).
 * Unsubscribe stays highest priority — Spam Act path.
 */

export const OUTREACH_REPLY_INTENTS = [
  'unsubscribe',
  'interested',
  'question',
  'not_now',
  'wrong_person',
  'other',
] as const

export type OutreachReplyIntent = (typeof OUTREACH_REPLY_INTENTS)[number]

export const OUTREACH_REPLY_INTENT_LABELS: Record<OutreachReplyIntent, string> = {
  unsubscribe: 'Unsubscribe',
  interested: 'Interested',
  question: 'Question',
  not_now: 'Not now',
  wrong_person: 'Wrong person',
  other: 'Other',
}

/** Intents that should appear in the Needs reply queue. */
export function outreachReplyNeedsAttention(intent: OutreachReplyIntent): boolean {
  return intent === 'interested' || intent === 'question' || intent === 'other'
}

/**
 * Keep only the newly typed reply — strip Gmail/Outlook quoted originals.
 * Otherwise our own footer ("reply with the single word unsubscribe") false-triggers opt-out,
 * and Needs reply would dump the full SELPIC outreach letter to admins.
 *
 * Cousins: Gmail KO/EN headers, Outlook From/Sent, > quote lines, already-stored dirty excerpts,
 * empty new-body (quote-only), admin notify email excerpt, dashboard latestSubtitle.
 */
export function extractNewReplyText(raw: string): string {
  let text = String(raw || '').replace(/\r\n/g, '\n')
  if (!text.trim()) return ''

  const cuts = [
    /\nOn .{8,240} wrote:\s*\n/i,
    /\nOn .{8,240} wrote:\s*$/im,
    /\nFrom:\s.+\nSent:\s/i,
    /\n-----Original Message-----\s*\n/i,
    /\n________________________________\s*\n/,
    /\n-+ ?Original Message ?-+\s*\n/i,
    /\nBegin forwarded message:\s*\n/i,
    /\n.+님이 작성:\s*\n/,
    /\n.+님이 작성:\s*$/m,
    /\n\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^\n]*님이 작성:/,
    /\n\d{4}년\s*\d{1,2}월\s*\d{1,2}일.+\n>/,
  ]
  for (const re of cuts) {
    const m = text.match(re)
    if (m && m.index != null && m.index > 0) {
      text = text.slice(0, m.index)
      break
    }
  }

  const lines = text.split('\n').filter((line) => {
    const t = line.trim()
    if (/^>/.test(t)) return false
    // Drop leftover Gmail quote markers without leading >
    if (/^님이 작성:/.test(t)) return false
    return true
  })
  return lines.join('\n').trim()
}

/**
 * Admin-facing body for Needs reply / notify / inbound summary.
 * Never surface the quoted SELPIC outreach thread.
 */
export function formatOutreachReplyAdminExcerpt(raw: string, maxLen = 800): string {
  const cleaned = extractNewReplyText(raw).trim()
  const headerOnly =
    !cleaned ||
    /^On .{8,240} wrote:?$/i.test(cleaned) ||
    /님이 작성:?\s*$/.test(cleaned) ||
    /^\d{4}년[\s\S]*님이 작성:?\s*$/.test(cleaned)
  if (headerOnly) {
    return '(Quoted thread only — no new customer text detected)'
  }
  const limit = Math.max(40, Math.min(2000, maxLen))
  if (cleaned.length <= limit) return cleaned
  return `${cleaned.slice(0, limit - 1)}…`
}

/**
 * Rule-based classifier. Order is the contract — do not reshuffle without tests.
 * Cousins: bare "thanks", bounce-like auto-replies, mixed intent ("interested but unsubscribe").
 */
export function classifyOutreachReplyIntent(subject: string, text: string): OutreachReplyIntent {
  const newBody = extractNewReplyText(text)
  const classifyBlob = `${subject}\n${newBody || text}`.toLowerCase()
  const optBlob = (newBody.trim() ? newBody : text).toLowerCase()

  // 1) Opt-out — only on the new reply text (not quoted SELPIC footer)
  if (
    /\bunsubscribe\b/.test(optBlob) ||
    /\bopt[-\s]?out\b/.test(optBlob) ||
    /\bremove me\b/.test(optBlob)
  ) {
    return 'unsubscribe'
  }
  if (/\bstop (emailing|contacting)\b/.test(optBlob) || /\bdo not contact\b/.test(optBlob)) {
    return 'unsubscribe'
  }

  // 2) Wrong recipient
  if (
    /\bwrong (person|email|address)\b/.test(classifyBlob) ||
    /\bnot the (right|correct) (person|contact)\b/.test(classifyBlob) ||
    /\bno longer (work|works|employed)\b/.test(classifyBlob) ||
    /\bleft the (school|centre|center|organisation|organization)\b/.test(classifyBlob)
  ) {
    return 'wrong_person'
  }

  // 3) Not now / later
  if (
    /\bnot (interested|right now|at (this|the) (time|moment))\b/.test(classifyBlob) ||
    /\bno thank/.test(classifyBlob) ||
    /\bmaybe (next|later|another)\b/.test(classifyBlob) ||
    /\bcontact (us |me )?next (term|year|quarter)\b/.test(classifyBlob) ||
    /\btoo busy\b/.test(classifyBlob)
  ) {
    return 'not_now'
  }

  // 4) Interested / apply
  if (
    /\b(interested|keen|love to|would like to|want to) (learn|hear|know|join|apply|partner)\b/.test(
      classifyBlob
    ) ||
    /\bi would like to apply\b/.test(classifyBlob) ||
    /\b(sign|signing) (us |me )?up\b/.test(classifyBlob) ||
    /\bhow do (we|i) (apply|join|start)\b/.test(classifyBlob) ||
    /\bsounds (good|great|interesting)\b/.test(classifyBlob) ||
    /\blet'?s (do|proceed|go ahead)\b/.test(classifyBlob)
  ) {
    return 'interested'
  }

  // 5) Question
  if (
    /\?/.test(classifyBlob) ||
    /\b(can you|could you|please) (explain|clarify|send|confirm)\b/.test(classifyBlob) ||
    /\b(what|how|when|where|who|why)\b.{0,40}\b(cost|fee|commission|cashback|discount|apply)\b/.test(
      classifyBlob
    ) ||
    /\bmore (info|information|details)\b/.test(classifyBlob)
  ) {
    return 'question'
  }

  return 'other'
}
