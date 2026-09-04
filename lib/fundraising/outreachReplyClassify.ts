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
 * Rule-based classifier. Order is the contract — do not reshuffle without tests.
 * Cousins: bare "thanks", bounce-like auto-replies, mixed intent ("interested but unsubscribe").
 */
export function classifyOutreachReplyIntent(subject: string, text: string): OutreachReplyIntent {
  const blob = `${subject}\n${text}`.toLowerCase()

  // 1) Opt-out always wins (even if they also say thanks)
  if (/\bunsubscribe\b/.test(blob) || /\bopt[-\s]?out\b/.test(blob) || /\bremove me\b/.test(blob)) {
    return 'unsubscribe'
  }
  if (/\bstop (emailing|contacting)\b/.test(blob) || /\bdo not contact\b/.test(blob)) {
    return 'unsubscribe'
  }

  // 2) Wrong recipient
  if (
    /\bwrong (person|email|address)\b/.test(blob) ||
    /\bnot the (right|correct) (person|contact)\b/.test(blob) ||
    /\bno longer (work|works|employed)\b/.test(blob) ||
    /\bleft the (school|centre|center|organisation|organization)\b/.test(blob)
  ) {
    return 'wrong_person'
  }

  // 3) Not now / later
  if (
    /\bnot (interested|right now|at (this|the) (time|moment))\b/.test(blob) ||
    /\bno thank/.test(blob) ||
    /\bmaybe (next|later|another)\b/.test(blob) ||
    /\bcontact (us |me )?next (term|year|quarter)\b/.test(blob) ||
    /\btoo busy\b/.test(blob)
  ) {
    return 'not_now'
  }

  // 4) Interested / apply
  if (
    /\b(interested|keen|love to|would like to|want to) (learn|hear|know|join|apply|partner)\b/.test(
      blob
    ) ||
    /\b(sign|signing) (us |me )?up\b/.test(blob) ||
    /\bhow do (we|i) (apply|join|start)\b/.test(blob) ||
    /\bsounds (good|great|interesting)\b/.test(blob) ||
    /\blet'?s (do|proceed|go ahead)\b/.test(blob)
  ) {
    return 'interested'
  }

  // 5) Question
  if (
    /\?/.test(blob) ||
    /\b(can you|could you|please) (explain|clarify|send|confirm)\b/.test(blob) ||
    /\b(what|how|when|where|who|why)\b.{0,40}\b(cost|fee|commission|cashback|discount|apply)\b/.test(
      blob
    ) ||
    /\bmore (info|information|details)\b/.test(blob)
  ) {
    return 'question'
  }

  // 6) Empty / auto-reply noise → other (still capture for human review)
  return 'other'
}
