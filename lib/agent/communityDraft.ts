/**
 * Wave 5 — template community / SELPIC N post drafts (HITL).
 * No LLM, no scrape, no auto-publish. Admin Approve → existing community posts API.
 *
 * Product vision (learned): SELPIC N is an AU parent/carer board — schools, kindergarten/kinder,
 * daycare/early learning, and families. Agent eventually suggests calendar-hot topics and can
 * draft on a cadence; publish stays Approve-gated until trust (Wave 6+ optional auto for
 * pre-approved templates only).
 */

import {
  COMMUNITY_POST_CATEGORIES,
  type CanonicalPostCategory,
} from '../community/navCategories'
import {
  describeAuEditorialWindow,
  suggestCommunityTopicsForDate,
  type CommunityCalendarSuggestion,
} from './auCommunityCalendar'

export type CommunityDraftTopicId =
  | 'back_to_school_labels'
  | 'name_label_care'
  | 'seasonal_print_idea'
  | 'custom_sticker_tips'
  | 'fundraising_awareness'
  | 'market_s_event'
  | 'custom_brief'

export type CommunityDraftTopic = {
  id: CommunityDraftTopicId
  label: string
  /** Suggested board category */
  category: CanonicalPostCategory
  /** Short English brief shown in the topic picker */
  brief: string
  /** Policy-safe starter sources (admin may edit / replace) */
  defaultSources: string[]
}

export type CommunityDraftInput = {
  topicId: CommunityDraftTopicId | string
  /** Admin-pasted source URLs or notes (preferred over scraping) */
  sourceNotes?: string
  /** Free-text brief when topicId is custom_brief */
  customBrief?: string
}

export type CommunityDraftResult = {
  topicId: CommunityDraftTopicId
  title: string
  content: string
  category: CanonicalPostCategory
  sources: string[]
  autonomyNote: string
}

export const COMMUNITY_DRAFT_TOPICS: readonly CommunityDraftTopic[] = [
  {
    id: 'back_to_school_labels',
    label: 'Back-to-care name labels (school, kinder, daycare)',
    category: 'News',
    brief:
      'AU term/care return: schools, kindergarten/kinder, daycare & early learning — bags, bottles, lunchboxes, cubby gear.',
    defaultSources: [
      'SELPIC product knowledge (name labels / stickers)',
      'Australian school / early-learning term calendar (admin-verified by state if needed)',
    ],
  },
  {
    id: 'name_label_care',
    label: 'How to apply name labels',
    category: 'Help',
    brief:
      'Practical care tips for school bags, kinder bottles, daycare lunchboxes, and washable surfaces.',
    defaultSources: ['SELPIC care guidance (internal)'],
  },
  {
    id: 'seasonal_print_idea',
    label: 'Seasonal print idea',
    category: 'Inspired',
    brief: 'Light AU seasonal prompt for custom stickers (no medical/legal/political claims).',
    defaultSources: ['SELPIC seasonal merchandising notes (internal)'],
  },
  {
    id: 'custom_sticker_tips',
    label: 'Custom sticker artwork tips',
    category: 'Inspired',
    brief: 'Simple artwork prep tips for parents and carers ordering custom stickers.',
    defaultSources: ['SELPIC bespoke / custom sticker FAQ (internal)'],
  },
  {
    id: 'fundraising_awareness',
    label: 'School & centre fundraising with SELPIC',
    category: 'News',
    brief:
      'High-level intro for schools, P&Cs, kindergarten committees, and early-learning centres (no cold scrape).',
    defaultSources: ['SELPIC fundraising programme overview (internal)'],
  },
  {
    id: 'market_s_event',
    label: 'Market S special / limited drop',
    category: 'News',
    brief:
      'Separate from school/care tips: announce a Market S (/hot-goods) special, limited, or seasonal drop. Edit product names and dates before Approve. Not for everyday catalogue spam.',
    defaultSources: [
      'SELPIC Market S / Hot Goods page (https://www.selpic.com.au/hot-goods)',
      'Admin-verified event dates and stock notes',
    ],
  },
  {
    id: 'custom_brief',
    label: 'Custom brief (admin or hot AU notes)',
    category: 'Daily',
    brief:
      'Paste a timely AU brief + sources (week/month “hot” topic). Agent builds a draft shell only — still Approve to publish.',
    defaultSources: [],
  },
] as const

const AUTONOMY_NOTE =
  'Wave 5 — draft only. Calendar suggestions guide topic choice; publish still needs community:write + Approve. Homepage Hero untouched. Auto-publish of pre-approved templates is Wave 6+.'

const BLOCKED_BRIEF_RE =
  /\b(diagnos|prescri|lawsuit|vote for|elect(ion)?|political party|guaranteed cure)\b/i

export function listCommunityDraftTopics(): CommunityDraftTopic[] {
  return [...COMMUNITY_DRAFT_TOPICS]
}

export function resolveCommunityDraftTopic(
  topicId: string
): CommunityDraftTopic | undefined {
  return COMMUNITY_DRAFT_TOPICS.find((t) => t.id === topicId)
}

export type CommunityDraftCatalogue = {
  topics: CommunityDraftTopic[]
  calendarWindow: string
  suggestedTopics: CommunityCalendarSuggestion[]
  visionNote: string
}

export function buildCommunityDraftCatalogue(now = new Date()): CommunityDraftCatalogue {
  return {
    topics: listCommunityDraftTopics(),
    calendarWindow: describeAuEditorialWindow(now),
    suggestedTopics: suggestCommunityTopicsForDate(now),
    visionNote:
      'SELPIC N aims to stay lively with AU-relevant tips for families, schools, kinder, and daycare. Admin can publish anytime; the agent suggests calendar-hot topics and drafts for Approve. Full auto-register stays behind HITL until Wave 6+ policy allows pre-approved slots.',
  }
}

function parseSources(sourceNotes: string | undefined, defaults: string[]): string[] {
  const fromNotes = (sourceNotes || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (fromNotes.length) return fromNotes.slice(0, 8)
  return defaults.slice(0, 8)
}

function sourcesFooter(sources: string[]): string {
  if (!sources.length) {
    return [
      '',
      '---',
      'Sources: Add admin-verified links or notes before publishing.',
    ].join('\n')
  }
  return ['', '---', 'Sources:', ...sources.map((s) => `• ${s}`)].join('\n')
}

function normalizeCategory(raw: string | undefined): CanonicalPostCategory {
  if (raw && (COMMUNITY_POST_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as CanonicalPostCategory
  }
  return 'News'
}

/** Build editable English title + body for admin Approve → publish. */
export function buildCommunityPostDraft(input: CommunityDraftInput): CommunityDraftResult {
  const topic =
    resolveCommunityDraftTopic(String(input.topicId || '')) ||
    resolveCommunityDraftTopic('custom_brief')!

  const customBrief = (input.customBrief || '').trim()
  if (topic.id === 'custom_brief' && BLOCKED_BRIEF_RE.test(customBrief)) {
    return {
      topicId: topic.id,
      title: 'Draft needs a safer brief',
      content: [
        'This brief looks like medical, legal, or political campaigning content.',
        '',
        'SELPIC N drafts stay on school, kindergarten/kinder, daycare, and family print topics.',
        'Edit the brief and generate again, or write the post manually on the Community admin page.',
        sourcesFooter(parseSources(input.sourceNotes, [])),
      ].join('\n'),
      category: 'Daily',
      sources: parseSources(input.sourceNotes, []),
      autonomyNote: AUTONOMY_NOTE,
    }
  }

  const sources = parseSources(input.sourceNotes, topic.defaultSources)
  const category = normalizeCategory(topic.category)

  switch (topic.id) {
    case 'back_to_school_labels':
      return {
        topicId: topic.id,
        title: 'Back to care & school: label bags, bottles, and lunchboxes',
        content: [
          'A new term — or a fresh start at daycare, long day care, kindergarten/kinder, preschool, or primary school — is a good moment to check name labels.',
          '',
          'Clear labels on bags, drink bottles, lunchboxes, hats, and cubby gear help lost items find their way home, whether that is a classroom hook or a daycare locker.',
          '',
          'If you are refreshing labels this season, choose a durable finish that matches how the item is washed or wiped. Soft bottles and textured lunchboxes need a clean, dry spot and firm pressure at the edges.',
          '',
          'SELPIC prints name labels and custom stickers for Australian families, schools, and early-learning communities.',
          '',
          'What works best in your house or centre — iron-on, waterproof, or a mix? Share a tip below so other parents and carers can learn too.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'name_label_care':
      return {
        topicId: topic.id,
        title: 'Quick tips: applying name labels so they last at school and daycare',
        content: [
          'Before you stick a label on, wipe the surface dry and free of dust, sunscreen, or oil — common on kinder drink bottles and daycare lunchboxes.',
          '',
          'Press firmly from the centre out so air bubbles do not lift the edges.',
          '',
          'For bottles and lunchboxes, avoid placing labels where they will scrape every time the lid twists or the bag zipper runs.',
          '',
          'If a label peels early, check whether the surface was wet or textured — a flat, clean spot works best on school bags and soft silicone bottles.',
          '',
          'Have a care tip that survived a term of daycare or school washes? Drop it in the comments.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'seasonal_print_idea':
      return {
        topicId: topic.id,
        title: 'A simple seasonal sticker idea for family and centre gear',
        content: [
          'Seasonal colours and short phrases make everyday items feel fresh without a full redesign — handy for home, school bags, and early-learning cubbies.',
          '',
          'Try one small motif — a leaf, star, or school/centre colour — next to a name or initials.',
          '',
          'Keep text large enough to read at arm’s length, and leave a little clear edge around artwork.',
          '',
          'When you are ready, upload a clear image or pick a simple layout in our custom sticker flow.',
          '',
          'What seasonal idea is popular in your suburb this month? Share kindly — this board is for helpful, respectful conversation.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'custom_sticker_tips':
      return {
        topicId: topic.id,
        title: 'Artwork tips for custom stickers that print cleanly',
        content: [
          'Start with a sharp image or a simple drawing — soft, blurry photos lose detail at small sizes.',
          '',
          'High contrast (dark on light, or light on dark) reads better on bags, bottles, and lunchboxes used at school or daycare.',
          '',
          'If you include a face or logo, send the largest file you have and note the size you want in millimetres.',
          '',
          'Our team can review bespoke requests and confirm size, quantity, and finish before print.',
          '',
          'Questions about artwork for kinder or class gifts? Ask in the comments — keep feedback constructive.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'fundraising_awareness':
      return {
        topicId: topic.id,
        title: 'Fundraising with personalised labels — schools and early learning',
        content: [
          'Many Australian schools, P&Cs, kindergarten committees, and early-learning centres raise funds with products families already use — including name labels and stickers.',
          '',
          'A clear partner programme helps organisers know the commission, sample options, and next steps without pressure.',
          '',
          'If your school or centre is exploring a fundraising partner, start from our fundraising page or contact SELPIC with your organisation name and suburb.',
          '',
          'We reply with programme details — no obligation cold lists, and outreach always respects opt-out.',
          '',
          'Organisers: what has worked for a respectful, parent-friendly fundraiser in your community? Share experiences kindly.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'market_s_event':
      return {
        topicId: topic.id,
        title: 'Market S: a special drop worth a look',
        content: [
          'Market S is where SELPIC highlights limited, seasonal, or special-event items on our official store — separate from everyday name-label tips.',
          '',
          'When a drop is live, we share clear details here: what it is, who it suits (families, school/kinder gear, gifts), and how long stock or the offer is expected to last.',
          '',
          'Edit this paragraph before publishing: replace with the current product name(s), dates, and any fair limits (for example while stocks last). Do not invent discounts or guarantee delivery times.',
          '',
          'Browse the current Market S selection on the official store: https://www.selpic.com.au/hot-goods',
          '',
          'Prices and stock can differ from third-party marketplaces. Community discussion is welcome — keep it respectful, and share real experience rather than hype.',
          sourcesFooter(sources),
        ].join('\n'),
        category,
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    case 'custom_brief':
    default: {
      const brief = customBrief || topic.brief
      return {
        topicId: 'custom_brief',
        title: 'Community update from SELPIC',
        content: [
          brief,
          '',
          'Edit this draft for SELPIC N — clear, helpful AU English for parents, carers, schools, kinder, and daycare.',
          'Invite polite discussion; avoid medical, legal, or political campaign claims.',
          '',
          'Add a short call to action only if it fits (for example visit /community, /fundraising, or /stickers/custom).',
          sourcesFooter(sources),
        ].join('\n'),
        category: 'Daily',
        sources,
        autonomyNote: AUTONOMY_NOTE,
      }
    }
  }
}
