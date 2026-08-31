/**
 * Wave 3 — template first-line reply drafts for Messages / Bespoke (HITL).
 * No LLM; grounded in the inbound payload the admin already sees.
 */

export type InboundDraftChannel = 'message' | 'bespoke'

export type InboundDraftInput = {
  channel: InboundDraftChannel
  customerName: string
  customerEmail: string
  subject?: string
  bodyExcerpt?: string
  requestId?: string
}

export type InboundDraftResult = {
  subject: string
  body: string
  intentHint: string
}

function cleanName(name: string): string {
  const n = name.trim()
  return n || 'there'
}

function classifyIntent(text: string): string {
  const t = text.toLowerCase()
  if (/\b(refund|chargeback|dispute|payment failed|overcharg)/.test(t)) return 'payment_dispute'
  if (/\b(ship|tracking|delivery|dispatch|where is my)/.test(t)) return 'shipping'
  if (/\b(fundrais|partner|school|commission|payout)/.test(t)) return 'fundraising'
  if (/\b(order|order #|order id|receipt)/.test(t)) return 'order_status'
  if (/\b(bespoke|custom|logo|label)/.test(t)) return 'bespoke_product'
  return 'general'
}

function excerpt(text: string, max = 400): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Build editable subject + body for admin Approve → Send. */
export function buildInboundReplyDraft(input: InboundDraftInput): InboundDraftResult {
  const name = cleanName(input.customerName)
  const combined = `${input.subject || ''} ${input.bodyExcerpt || ''}`
  const intentHint = classifyIntent(combined)
  const quote = excerpt(input.bodyExcerpt || input.subject || '')

  if (input.channel === 'bespoke') {
    const subject = `Re: Your bespoke label request${input.requestId ? ` (${input.requestId})` : ''}`
    const body = [
      `Dear ${name},`,
      '',
      'Thank you for your bespoke label request with SELPIC.',
      '',
      'We have received your details and will review artwork, size, and quantity shortly.',
      quote
        ? ['', 'For reference, here is a short summary of what you sent:', '', quote].join('\n')
        : '',
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

    return { subject, body, intentHint }
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
