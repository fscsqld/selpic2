/**
 * Wave 3 — template first-line reply drafts for Messages / Bespoke (HITL).
 * Optional LLM polish lives in inboundDraftLlm.ts (template fallback).
 * Grounded in the inbound payload the admin already sees.
 * Cousins: school-bag labels ≠ fundraising; payment/shipping beat product words;
 * promo/stock/address intents; admin intentOverride regenerates without reclassifying.
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
  /** When set (admin reclassify), skip auto classify for message channel. */
  intentOverride?: InboundIntentHint
}

export type InboundIntentHint =
  | 'payment_dispute'
  | 'shipping'
  | 'address_change'
  | 'promo_code'
  | 'fundraising'
  | 'order_status'
  | 'bespoke_product'
  | 'bespoke_request'
  | 'stock_availability'
  | 'general'

export type InboundDraftResult = {
  subject: string
  body: string
  intentHint: InboundIntentHint
}

/** Stable list for admin intent dropdown (message channel). */
export const INBOUND_MESSAGE_INTENT_OPTIONS: Array<{
  value: InboundIntentHint
  label: string
}> = [
  { value: 'payment_dispute', label: 'Payment / billing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'address_change', label: 'Address change' },
  { value: 'promo_code', label: 'Promo / discount code' },
  { value: 'bespoke_product', label: 'Custom print / stickers' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'order_status', label: 'Order status' },
  { value: 'stock_availability', label: 'Stock / availability' },
  { value: 'general', label: 'General enquiry' },
]

const INTENT_LABELS: Record<InboundIntentHint, string> = {
  payment_dispute: 'Payment / billing',
  shipping: 'Shipping',
  address_change: 'Address change',
  promo_code: 'Promo / discount code',
  fundraising: 'Fundraising',
  order_status: 'Order status',
  bespoke_product: 'Custom print / stickers',
  bespoke_request: 'Bespoke request',
  stock_availability: 'Stock / availability',
  general: 'General enquiry',
}

const MESSAGE_INTENT_SET = new Set(
  INBOUND_MESSAGE_INTENT_OPTIONS.map((o) => o.value)
)

export function isInboundMessageIntentHint(value: string): value is InboundIntentHint {
  return MESSAGE_INTENT_SET.has(value as InboundIntentHint)
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
 * Pull a likely order reference for draft closings (never invent one).
 * Cousins: #ORD-123, order 12345, receipt ABC.
 */
export function extractOrderRefHint(text: string): string | undefined {
  const t = String(text || '')
  const patterns = [
    /\b(ORD[-_\s]?\d{3,})\b/i,
    /\border\s*(?:number|#|id)?\s*[:#]?\s*([A-Z0-9-]{4,})\b/i,
    /\b#\s*([A-Z0-9-]{5,})\b/,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) return m[1].replace(/\s+/g, '').toUpperCase()
  }
  return undefined
}

/**
 * Template-era classifier. Order is a product contract — do not reshuffle without tests.
 * payment → address → shipping → promo → stock → product → fundraising → order → general.
 * Address before shipping so "change delivery address" is not swallowed by "delivery".
 * Bare "school" is not fundraising (school-bag labels are the common cousin).
 */
export function classifyIntent(text: string): InboundIntentHint {
  const t = text.toLowerCase()
  if (/\b(refund|chargeback|dispute|payment failed|overcharg|double\s+charg)/.test(t)) {
    return 'payment_dispute'
  }
  if (
    /\b(change|update|correct|wrong)\b.{0,40}\baddress\b/.test(t) ||
    /\b(shipping|delivery)\s+address\b/.test(t) ||
    /\bmove(d)?\s+(the\s+)?(order|package)\b/.test(t)
  ) {
    return 'address_change'
  }
  if (
    /\b(ship|tracking|dispatch|where is my|parcel)\b/.test(t) ||
    /\bwhere\s+is\b.{0,50}\b(order|package|parcel|tracking)\b/.test(t) ||
    (/\bdelivery\b/.test(t) && !/\bdelivery\s+address\b/.test(t))
  ) {
    return 'shipping'
  }
  if (/\b(promo(\s+code)?|coupon|voucher|discount\s+code|gift\s+code)\b/.test(t)) {
    return 'promo_code'
  }
  // Stock phrases beat bare product words ("sticker out of stock")
  if (/\b(in\s+stock|out\s+of\s+stock|restock|back\s+in\s+stock|availability|sold\s+out)\b/.test(t)) {
    return 'stock_availability'
  }
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

function openingForIntent(intentHint: InboundIntentHint): string {
  switch (intentHint) {
    case 'shipping':
      return 'Thank you for contacting SELPIC about your delivery. We have received your message and will check tracking details for you.'
    case 'address_change':
      return 'Thank you for contacting SELPIC about a delivery address update. We have received your message and will check whether the order can still be redirected.'
    case 'promo_code':
      return 'Thank you for contacting SELPIC about a promo or discount code. We have received your message and will check what we can apply for you.'
    case 'order_status':
      return 'Thank you for contacting SELPIC about your order. We have received your message and will look up the latest status.'
    case 'fundraising':
      return 'Thank you for contacting SELPIC about fundraising. We have received your message and will connect you with the right team member.'
    case 'payment_dispute':
      return 'Thank you for contacting SELPIC. We treat billing questions carefully — a team member will review your message before we reply with next steps.'
    case 'bespoke_product':
      return 'Thank you for contacting SELPIC about custom stickers or labels. We have received your message and will review size, artwork, and quantity with you.'
    case 'stock_availability':
      return 'Thank you for contacting SELPIC about product availability. We have received your message and will check stock for you.'
    case 'bespoke_request':
      return 'Thank you for your bespoke label request with SELPIC.'
    default:
      return 'Thank you for contacting SELPIC. We have received your message and will follow up as soon as we can.'
  }
}

function closingForIntent(intentHint: InboundIntentHint, orderRef?: string): string {
  const orderLine = orderRef
    ? `We noted a possible order reference (${orderRef}) — please confirm if that is correct.`
    : null

  switch (intentHint) {
    case 'payment_dispute':
      return [
        'Please do not share full card numbers in email. We will confirm the safe next step shortly.',
        orderLine,
      ]
        .filter(Boolean)
        .join(' ')
    case 'bespoke_product':
      // Absorb micro-polish in template (comma / "any artwork") — do not spend OpenAI on this.
      return 'Please reply with the size (mm), quantity, and any artwork or a photo of the surface (for example, a billy kart, laptop, or bottle) if you have them.'
    case 'shipping':
      return [
        orderLine ||
          'If you have an order number or tracking screenshot, reply to this email and we will include them in the review.',
        'We will come back with the latest carrier update.',
      ]
        .filter(Boolean)
        .join(' ')
    case 'address_change':
      return [
        orderLine || 'Please reply with the order number and the full new delivery address.',
        'If the parcel has already left our studio, redirection may not always be possible.',
      ]
        .filter(Boolean)
        .join(' ')
    case 'promo_code':
      return 'Please reply with the promo code (if you have one) and whether you need help at checkout or on an existing order.'
    case 'stock_availability':
      return 'Please reply with the product name or link, and the size or colour you need if relevant.'
    case 'fundraising':
      return 'If you already applied on our fundraising page, include the organisation name so we can match your enquiry faster.'
    case 'order_status':
      return (
        orderLine ||
        'If you have an order number or extra photos, reply to this email and we will include them in the review.'
      )
    default:
      return (
        orderLine ||
        'If you have an order number or extra photos, reply to this email and we will include them in the review.'
      )
  }
}

/** Build editable subject + body for admin Approve → Send. */
export function buildInboundReplyDraft(input: InboundDraftInput): InboundDraftResult {
  const name = cleanName(input.customerName)
  const combined = `${input.subject || ''} ${input.bodyExcerpt || ''}`
  const orderRef = extractOrderRefHint(combined)

  if (input.channel === 'bespoke') {
    const summary = bespokeSummaryForDraft(
      formatBespokeStickerPayloadSummary(input.bespokePayload) || input.bodyExcerpt || ''
    )
    const subject = bespokeInboundSubject(input.bespokePayload)
    const body = [
      `Dear ${name},`,
      '',
      openingForIntent('bespoke_request'),
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

  const intentHint =
    input.intentOverride && isInboundMessageIntentHint(input.intentOverride)
      ? input.intentOverride
      : classifyIntent(combined)

  const quote = bespokeSummaryForDraft(input.bodyExcerpt || input.subject || '', 1200)
  const subjectBase = (input.subject || '').trim() || 'your enquiry'
  const subject = subjectBase.toLowerCase().startsWith('re:')
    ? subjectBase
    : `Re: ${subjectBase}`

  const body = [
    `Dear ${name},`,
    '',
    openingForIntent(intentHint),
    quote ? ['', 'You wrote:', '', `"${quote}"`].join('\n') : '',
    '',
    closingForIntent(intentHint, orderRef),
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
