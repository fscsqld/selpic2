/**
 * Free newsletter campaign drafts for Agent HITL.
 * Consumer-subscriber lists only — never fundraising outreach_targets.
 * Never auto-send; Apply → Newsletter admin → human Send.
 *
 * Cousins: inventing $/%/stock/ship dates, empty topic, AU English,
 * mixing school outreach emails, HTML injection in plain body, Hero edits.
 */

export type NewsletterCampaignType =
  | 'promotion'
  | 'announcement'
  | 'event'
  | 'newsletter'
  | 'general'

export type NewsletterDraftTopicId =
  | 'term_start_labels'
  | 'new_product_highlight'
  | 'selpic_n_community'
  | 'seasonal_gift_idea'
  | 'store_announcement'
  | 'event_reminder'
  | 'fair_promo_reminder'

export type NewsletterDraftTopic = {
  id: NewsletterDraftTopicId
  label: string
  type: NewsletterCampaignType
  blurb: string
}

export type NewsletterDraftInput = {
  topicId: NewsletterDraftTopicId | string
  /** Admin notes (verified facts only). */
  sourceNotes?: string
  /** Optional brief for custom angle. */
  customBrief?: string
}

export type NewsletterDraftResult = {
  topicId: string
  type: NewsletterCampaignType
  subject: string
  message: string
  autonomyNote: string
}

export const NEWSLETTER_DRAFT_TOPICS: NewsletterDraftTopic[] = [
  {
    id: 'term_start_labels',
    label: 'Term start — name labels',
    type: 'newsletter',
    blurb: 'Back-to-school / term tips for bags, bottles, and lunchboxes.',
  },
  {
    id: 'new_product_highlight',
    label: 'New product highlight',
    type: 'announcement',
    blurb: 'Feature a verified SKU without inventing price or stock.',
  },
  {
    id: 'selpic_n_community',
    label: 'SELPIC N community',
    type: 'newsletter',
    blurb: 'Point subscribers to the community board (not school outreach).',
  },
  {
    id: 'seasonal_gift_idea',
    label: 'Seasonal gift idea',
    type: 'general',
    blurb: 'Gift-ready personalisation for birthdays and class gifts.',
  },
  {
    id: 'store_announcement',
    label: 'Store announcement',
    type: 'announcement',
    blurb: 'Operational update (hours, shipping note) — verified facts only.',
  },
  {
    id: 'event_reminder',
    label: 'Event reminder',
    type: 'event',
    blurb: 'Market / drop reminder — edit dates before send.',
  },
  {
    id: 'fair_promo_reminder',
    label: 'Promo reminder (fair claims only)',
    type: 'promotion',
    blurb: 'Remind about an existing promo code — do not invent % or $.',
  },
]

export function listNewsletterDraftTopics(): NewsletterDraftTopic[] {
  return NEWSLETTER_DRAFT_TOPICS.slice()
}

export function resolveNewsletterDraftTopic(
  topicId: string
): NewsletterDraftTopic | undefined {
  return NEWSLETTER_DRAFT_TOPICS.find((t) => t.id === topicId)
}

function notesBlock(sourceNotes?: string, customBrief?: string): string {
  const parts: string[] = []
  const notes = (sourceNotes || '').trim()
  const brief = (customBrief || '').trim()
  if (notes) parts.push(`Verified notes from admin:\n${notes}`)
  if (brief) parts.push(`Campaign angle:\n${brief}`)
  return parts.length ? `\n\n${parts.join('\n\n')}` : ''
}

/** True if text looks like leaked admin/dev instructions. */
export function newsletterDraftLooksLikeInternalMeta(text: string): boolean {
  return /Do not invent|Draft only|HITL|outreach_targets|Apply to the form|prompt-engineering/i.test(
    text
  )
}

export function buildNewsletterCampaignDraft(
  input: NewsletterDraftInput
): NewsletterDraftResult {
  const topic =
    resolveNewsletterDraftTopic(String(input.topicId || '').trim()) ||
    NEWSLETTER_DRAFT_TOPICS[0]
  const extra = notesBlock(input.sourceNotes, input.customBrief)
  const autonomyNote =
    'Draft only — never auto-send. Apply opens Newsletter admin with this subject/body. Subscriber list only; do not use fundraising outreach_targets. Edit prices, codes, and dates before Send.'

  const builders: Record<NewsletterDraftTopicId, () => { subject: string; message: string }> = {
    term_start_labels: () => ({
      subject: 'Ready for term? Clear name labels for bags and bottles',
      message: [
        'Hi there,',
        '',
        'A new term is a great moment to refresh name labels on bags, drink bottles, lunchboxes, and centre gear.',
        '',
        'SELPIC labels are built for everyday Australian school and daycare routines — easy to read, durable, and ready for busy mornings.',
        '',
        'Browse name labels and custom options on our official store:',
        'https://www.selpic.com.au/stickers',
        '',
        'Thank you for being part of the SELPIC community.',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    new_product_highlight: () => ({
      subject: 'Something new on the SELPIC store',
      message: [
        'Hi there,',
        '',
        'We wanted to share a product highlight from our official store.',
        '',
        'Edit before send: add the product name and a short, verified description. Do not invent prices, discounts, or stock counts.',
        '',
        'Shop on the official store:',
        'https://www.selpic.com.au',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    selpic_n_community: () => ({
      subject: 'SELPIC N — tips and stories from our community',
      message: [
        'Hi there,',
        '',
        'SELPIC N is our community space for Australian families, carers, and early-learning centres — practical label tips, print ideas, and respectful conversation.',
        '',
        'Have a look (and share kindly if you post):',
        'https://www.selpic.com.au/community',
        '',
        'This email goes to newsletter subscribers only — it is separate from school fundraising outreach.',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    seasonal_gift_idea: () => ({
      subject: 'A simple personalised gift idea',
      message: [
        'Hi there,',
        '',
        'Looking for a practical gift for birthdays, term starts, or class thank-yous?',
        '',
        'Personalised name labels are a small gift that gets used every day on bags, bottles, and lunchboxes.',
        '',
        'Explore options on the official store:',
        'https://www.selpic.com.au/stickers',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    store_announcement: () => ({
      subject: 'A quick update from SELPIC',
      message: [
        'Hi there,',
        '',
        'We have a short store update for you.',
        '',
        'Edit before send: replace this paragraph with the verified announcement (hours, shipping note, or policy change). Do not invent dates or guarantees.',
        '',
        'Official store: https://www.selpic.com.au',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    event_reminder: () => ({
      subject: 'Reminder: a SELPIC drop or market moment',
      message: [
        'Hi there,',
        '',
        'A quick reminder about an upcoming SELPIC highlight on our official store.',
        '',
        'Edit before send: add the event or drop name, verified dates, and any fair limits (for example while stocks last). Do not invent discounts.',
        '',
        'Market S / Hot Goods: https://www.selpic.com.au/hot-goods',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
    fair_promo_reminder: () => ({
      subject: 'A reminder about your SELPIC offer',
      message: [
        'Hi there,',
        '',
        'This is a friendly reminder about a promotion available to newsletter subscribers on our official store.',
        '',
        'Edit before send: insert only a verified promo code and its real terms. Do not invent percentages, dollar amounts, or expiry dates.',
        '',
        'Shop: https://www.selpic.com.au',
        'Promo codes page (if applicable): https://www.selpic.com.au/promo-codes',
        '',
        '— The SELPIC team',
      ].join('\n'),
    }),
  }

  const built = builders[topic.id]()
  return {
    topicId: topic.id,
    type: topic.type,
    subject: built.subject,
    message: `${built.message}${extra}`,
    autonomyNote,
  }
}
