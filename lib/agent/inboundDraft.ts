/**
 * Wave 3 — template first-line reply drafts for Messages / Bespoke (HITL).
 * No LLM; grounded in the inbound payload the admin already sees.
 */

import { bespokeInboundSubject, formatBespokeStickerPayloadSummary } from './bespokeRequestSummary'

export type InboundDraftChannel = 'message' | 'bespoke'

export type InboundDraftInput = {
  channel: InboundDraftChannel
  customerName: string
  customerEmail: string
  subject?: string
  bodyExcerpt?: string
  requestId?: string
  bespokePayload?: Record<string, unknown>
}

export type InboundIntentHint =
  | 'payment_dispute'
  | 'shipping'
  | 'fundraising'
  | 'order_status'
  | 'bespoke_product'
  | 'bespoke_request'
  | 'general'

export type InboundDraftResult = {
  subject: string
  body: string
  intentHint: InboundIntentHint
}

const INTENT_LABELS: Record<InboundIntentHint, string> = {
  payment_dispute: 'Payment / billing',
  shipping: 'Shipping',
  fundraising: 'Fundraising',
  order_status: 'Order status',
  bespoke_product: 'Custom print / stickers',
  bespoke_request: 'Bespoke request',
  general: 'General enquiry',
}

/** Admin-facing English label for intentHint (never show raw snake_case as the only label). */
export function formatInboundIntentLabel(hint: string): string {
  if (hint in INTENT_LABELS) return INTENT_LABELS[hint as InboundIntentHint]
  return hint.replace(/_/g, ' ') || 'General enquiry'
}

function cleanName(name: string): string {
  const n = name.trim()
  return n || 'there'
}

/** Print / name-label / custom product language (Contact form — not the Bespoke channel). */
const PRODUCT_ENQUIRY_RE =
  /\b(bespoke|custom|logo|labels?|stickers?|decal|vinyl|printing|prints?|iron[-\s]?on|name\s+tags?)\b/

/**
 * Template-era classifier. Order is a product contract:
 * payment (compliance) → shipping → print/sticker product → fundraising → generic order.
 * Bare "school" is not fundraising (school-bag labels are the common cousin).
 */
export function classifyIntent(text: string): InboundIntentHint {
  const t = text.toLowerCase()
  if (/\b(refund|chargeback|dispute|payment failed|overcharg)/.test(t)) return 'payment_dispute'
  if (/\b(ship|tracking|delivery|dispatch|where is my)/.test(t)) return 'shipping'
  if (PRODUCT_ENQUIRY_RE.test(t)) return 'bespoke_product'
  if (/\b(fundrais|partner|commission|payout|p\s*&\s*c)\b/.test(t)) return 'fundraising'
  if (/\b(order|order #|order id|receipt)\b/.test(t)) return 'order_status'
  return 'general'
}

function bespokeSummaryForDraft(text: string, max = 1200): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Build editable subject + body for admin Approve → Send. */
export function buildInboundReplyDraft(input: InboundDraftInput): InboundDraftResult {
  const name = cleanName(input.customerName)
  const combined = `${input.subject || ''} ${input.bodyExcerpt || ''}`
  const intentHint = classifyIntent(combined)
  const quote =
    input.channel === 'bespoke'
      ? bespokeSummaryForDraft(
          formatBespokeStickerPayloadSummary(input.bespokePayload) || input.bodyExcerpt || ''
        )
      : bespokeSummaryForDraft(input.bodyExcerpt || input.subject || '', 1200)

  if (input.channel === 'bespoke') {
    const summary = bespokeSummaryForDraft(
      formatBespokeStickerPayloadSummary(input.bespokePayload) || input.bodyExcerpt || ''
    )
    const subject = bespokeInboundSubject(input.bespokePayload)
    const body = [
      `Dear ${name},`,
      '',
      'Thank you for your bespoke label request with SELPIC.',
      '',
      'We have received your details and will review artwork, size, and quantity shortly.',
      summary ? ['', 'Request summary:', '', summary].join('\n') : '',
      '',
      'If anything in the request has changed (logo file, delivery date, or quantity), reply to this email and we will update the brief.',
      '',
      'Kind regards,',
      'Selpic Customer Care',
      'https://selpic.com.au',
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n')
      .trim()

    return { subject, body, intentHint: 'bespoke_request' }
  }

  const subjectBase = (input.subject || '').trim() || 'your enquiry'
  const subject = subjectBase.toLowerCase().startsWith('re:')
    ? subjectBase
    : `Re: ${subjectBase}`

  let opening =
    'Thank you for contacting SELPIC. We have received your message and will follow up as soon as we can.'
  if (intentHint === 'shipping') {
    opening =
      'Thank you for contacting SELPIC about your delivery. We have received your message and will check tracking details for you.'
  } else if (intentHint === 'order_status') {
    opening =
      'Thank you for contacting SELPIC about your order. We have received your message and will look up the latest status.'
  } else if (intentHint === 'fundraising') {
    opening =
      'Thank you for contacting SELPIC about fundraising. We have received your message and will connect you with the right team member.'
  } else if (intentHint === 'payment_dispute') {
    opening =
      'Thank you for contacting SELPIC. We treat billing questions carefully — a team member will review your message before we reply with next steps.'
  } else if (intentHint === 'bespoke_product') {
    opening =
      'Thank you for contacting SELPIC about custom stickers or labels. We have received your message and will review size, artwork, and quantity with you.'
  }

  const body = [
    `Dear ${name},`,
    '',
    opening,
    quote
      ? ['', 'You wrote:', '', `"${quote}"`].join('\n')
      : '',
    '',
    intentHint === 'payment_dispute'
      ? 'Please do not share full card numbers in email. We will confirm the safe next step shortly.'
      : intentHint === 'bespoke_product'
        ? 'Please reply with size (mm), quantity, and artwork or a photo of the surface (for example a billy kart, laptop, or bottle) if you have them.'
        : 'If you have an order number or extra photos, reply to this email and we will include them in the review.',
    '',
    'Kind regards,',
    'Selpic Customer Care',
    'https://selpic.com.au',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
    .trim()

  return { subject, body, intentHint }
}
