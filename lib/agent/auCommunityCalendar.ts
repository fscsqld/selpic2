/**
 * AU-oriented seasonality for SELPIC N / Community topic suggestions.
 * Used to rank which template topics are “hot” this week — not to auto-publish.
 *
 * School terms are approximate national windows (states vary). Prefer admin
 * override via custom_brief + source notes when a state calendar differs.
 */

import type { CommunityDraftTopicId } from './communityDraft'

export type CommunityCalendarSuggestion = {
  topicId: CommunityDraftTopicId
  label: string
  reason: string
  /** 1 = strongest suggestion for this window */
  priority: number
}

function monthDay(d: Date): { month: number; day: number } {
  return { month: d.getMonth() + 1, day: d.getDate() }
}

/** Rough AU school-year windows (not legal advice; editorial only). */
export function describeAuEditorialWindow(now = new Date()): string {
  const { month, day } = monthDay(now)
  if ((month === 1 && day >= 15) || month === 2) {
    return 'AU back-to-care / Term 1 start window (late Jan–Feb)'
  }
  if (month === 3 || (month === 4 && day <= 15)) {
    return 'AU Term 1 mid / Easter season window'
  }
  if ((month === 4 && day > 15) || month === 5 || (month === 6 && day <= 20)) {
    return 'AU Term 2 / Mother’s Day season window'
  }
  if ((month === 6 && day > 20) || (month === 7 && day <= 25)) {
    return 'AU mid-year / Term 3 return window'
  }
  if ((month === 7 && day > 25) || month === 8 || (month === 9 && day <= 10)) {
    return 'AU Term 3 / Father’s Day (AU) window'
  }
  if ((month === 9 && day > 10) || month === 10) {
    return 'AU Term 4 start / spring events window'
  }
  if (month === 11 || (month === 12 && day <= 15)) {
    return 'AU end-of-year / holiday prep window'
  }
  return 'AU summer holiday / new-year prep window'
}

/**
 * Rank template topics for the given AU date.
 * Always includes at least two actionable topics; custom_brief stays available in the picker.
 */
export function suggestCommunityTopicsForDate(now = new Date()): CommunityCalendarSuggestion[] {
  const { month, day } = monthDay(now)
  const suggestions: CommunityCalendarSuggestion[] = []

  const push = (
    topicId: CommunityDraftTopicId,
    label: string,
    reason: string,
    priority: number
  ) => {
    if (suggestions.some((s) => s.topicId === topicId)) return
    suggestions.push({ topicId, label, reason, priority })
  }

  // Late Jan–Feb + mid-year July: back to school / daycare / kinder
  if ((month === 1 && day >= 10) || month === 2 || (month === 7 && day >= 5 && day <= 31)) {
    push(
      'back_to_school_labels',
      'Back-to-care name labels',
      'Peak return for schools, kindergarten/kinder, daycare and early learning — labels on bags, bottles, lunchboxes.',
      1
    )
    push(
      'name_label_care',
      'How to apply name labels',
      'Parents and carers re-apply labels after holidays or new bottles.',
      2
    )
    push(
      'fundraising_awareness',
      'School & centre fundraising',
      'P&Cs and early-learning centres often plan fundraising near term start.',
      3
    )
  }

  // Mother's Day AU — second Sunday in May (approx whole May editorial)
  if (month === 5) {
    push(
      'seasonal_print_idea',
      'Seasonal print idea',
      'Mother’s Day gifting season in Australia — light custom sticker ideas.',
      1
    )
    push(
      'market_s_event',
      'Market S special / limited drop',
      'Gifting season — only if a Market S drop is actually live; edit product names before Approve.',
      2
    )
    push(
      'custom_sticker_tips',
      'Custom sticker artwork tips',
      'Families prep artwork for gifts and keepsakes.',
      3
    )
  }

  // Father's Day AU — first Sunday in September
  if (month === 9 && day <= 14) {
    push(
      'seasonal_print_idea',
      'Seasonal print idea',
      'Father’s Day (Australia) window — short seasonal print prompts.',
      1
    )
    push(
      'market_s_event',
      'Market S special / limited drop',
      'Gift shopping window — use only when a Market S event is running.',
      2
    )
    push('custom_sticker_tips', 'Custom sticker artwork tips', 'Gift artwork prep.', 3)
  }

  // Easter-ish Mar–mid Apr
  if (month === 3 || (month === 4 && day <= 20)) {
    push(
      'seasonal_print_idea',
      'Seasonal print idea',
      'Autumn / Easter school-holiday craft window — keep claims light and non-religious unless admin briefs otherwise.',
      1
    )
    push('name_label_care', 'How to apply name labels', 'Holiday gear refresh after camps and visits.', 2)
  }

  // End of year / Christmas Dec–early Jan
  if (month === 12 || (month === 1 && day < 10)) {
    push(
      'seasonal_print_idea',
      'Seasonal print idea',
      'End-of-year celebrations and summer holiday labels / stickers.',
      1
    )
    push(
      'market_s_event',
      'Market S special / limited drop',
      'Holiday shopping window — announce a real Market S drop only; no invented discounts.',
      2
    )
    push(
      'fundraising_awareness',
      'School & centre fundraising',
      'Many schools wrap fundraising and thank-you gifts in Term 4 / December.',
      3
    )
    push('custom_sticker_tips', 'Custom sticker artwork tips', 'Holiday artwork and class gifts.', 4)
  }

  // Term 4 spring events
  if (month === 10 || month === 11) {
    push(
      'fundraising_awareness',
      'School & centre fundraising',
      'Fetes, spring fairs, and P&C drives are common in Term 4.',
      1
    )
    push(
      'market_s_event',
      'Market S special / limited drop',
      'Spring fair / event merch window — only when Market S has a live special.',
      2
    )
    push('custom_sticker_tips', 'Custom sticker artwork tips', 'Event and fair merchandise artwork.', 3)
    push('seasonal_print_idea', 'Seasonal print idea', 'Spring colours and outdoor gear labels.', 4)
  }

  // Fallback always-on evergreen if nothing matched strongly
  if (suggestions.length === 0) {
    push(
      'name_label_care',
      'How to apply name labels',
      'Evergreen help for daycare, kinder, and school gear.',
      1
    )
    push(
      'custom_sticker_tips',
      'Custom sticker artwork tips',
      'Evergreen custom-print guidance for Australian families.',
      2
    )
    push(
      'fundraising_awareness',
      'School & centre fundraising',
      'Evergreen intro for schools and early-learning partners.',
      3
    )
  }

  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 5)
}
