/**
 * Storefront navigation: five topic chips + All.
 * Stored post.category values may be legacy English names or canonical short names.
 */

export type CanonicalPostCategory = 'Daily' | 'Inspired' | 'Help' | 'News'

/** Chip row: All first, then postable topics (no slug "all" for new posts). */
export const COMMUNITY_NAV_CHIPS = [
  { id: 'all', name: 'All', emoji: '🌈' },
  { id: 'daily', name: 'Daily', emoji: '💬' },
  { id: 'inspired', name: 'Inspired', emoji: '✨' },
  { id: 'help', name: 'Help', emoji: '🙌' },
  { id: 'news', name: 'News', emoji: '📅' },
] as const

export const COMMUNITY_POST_CATEGORIES: readonly CanonicalPostCategory[] = [
  'Daily',
  'Inspired',
  'Help',
  'News',
] as const

const LEGACY_TO_NAV: Record<string, string> = {
  All: 'All',
  General: 'Daily',
  'Off-Topic': 'Daily',
  OffTopic: 'Daily',
  'Design Showcase': 'Inspired',
  'DIY Projects': 'Inspired',
  'Tips & Tricks': 'Inspired',
  Questions: 'Help',
  Feedback: 'Help',
  Events: 'News',
  Event: 'News',
}

/** Map DB/local category string → nav chip label (All | Daily | Inspired | Help | News). */
export function mapStoredCategoryToNav(stored: string): string {
  const t = stored?.trim()
  if (!t) return 'Daily'
  if (t === 'All') return 'All'
  if (LEGACY_TO_NAV[t]) return LEGACY_TO_NAV[t]
  if ((COMMUNITY_POST_CATEGORIES as readonly string[]).includes(t)) return t
  return 'Daily'
}

export function navBadgeForStoredCategory(stored: string): { emoji: string; label: string } {
  const nav = mapStoredCategoryToNav(stored)
  const chip = COMMUNITY_NAV_CHIPS.find((c) => c.name === nav)
  return { emoji: chip?.emoji ?? '💬', label: nav }
}

/** Canonical value for post editor selects (never "All"). */
export function editorCategoryValue(stored: string): CanonicalPostCategory {
  const nav = mapStoredCategoryToNav(stored)
  if (nav === 'All') return 'Daily'
  if ((COMMUNITY_POST_CATEGORIES as readonly string[]).includes(nav))
    return nav as CanonicalPostCategory
  return 'Daily'
}

/** Resolved UI row for table badges (maps legacy strings via nav). */
export function canonicalRowForStoredCategory(stored: string): UiCommunityCategory | undefined {
  const nav = mapStoredCategoryToNav(stored)
  const name = nav === 'All' ? 'Daily' : nav
  return (
    CANONICAL_COMMUNITY_CATEGORY_ROWS.find((r) => r.name === name) ??
    CANONICAL_COMMUNITY_CATEGORY_ROWS.find((r) => r.name === 'Daily')
  )
}

/** Badge styling per nav label (posts list / modals). */
export function navPillClasses(navLabel: string): { bg: string; text: string } {
  switch (navLabel) {
    case 'All':
      return { bg: 'from-violet-100 to-fuchsia-100', text: 'text-violet-800' }
    case 'Daily':
      return { bg: 'from-sky-100 to-cyan-100', text: 'text-sky-800' }
    case 'Inspired':
      return { bg: 'from-amber-100 to-orange-100', text: 'text-amber-900' }
    case 'Help':
      return { bg: 'from-emerald-100 to-teal-100', text: 'text-emerald-900' }
    case 'News':
      return { bg: 'from-indigo-100 to-blue-100', text: 'text-indigo-800' }
    default:
      return { bg: 'from-gray-100 to-slate-100', text: 'text-gray-800' }
  }
}

export interface UiCommunityCategory {
  id: string
  name: string
  emoji: string
  bgColor: string
  textColor: string
  borderColor: string
  order: number
  isActive: boolean
  isDefault?: boolean
}

/** Defaults for admin + localStorage (matches COMMUNITY_NAV_CHIPS). */
export const CANONICAL_COMMUNITY_CATEGORY_ROWS: UiCommunityCategory[] = [
  {
    id: 'all',
    name: 'All',
    emoji: '🌈',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    order: 0,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'daily',
    name: 'Daily',
    emoji: '💬',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-800',
    borderColor: 'border-sky-200',
    order: 1,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'inspired',
    name: 'Inspired',
    emoji: '✨',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    order: 2,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'help',
    name: 'Help',
    emoji: '🙌',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-200',
    order: 3,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'news',
    name: 'News',
    emoji: '📅',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-200',
    order: 4,
    isActive: true,
    isDefault: true,
  },
]
