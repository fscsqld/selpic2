import type { SubcategoryItem } from '@/lib/contentStore'
import { getStickersSubcategoryHref, toStickersSubcategorySlug } from '@/lib/stickersSubcategoryHref'

export type SubcategoryParent = 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'

/**
 * Default link when admin leaves Link URL blank.
 * Only Stickers has real `/stickers/[slug]` pages today — other parents use the hub route
 * until sister subcategory routes ship (see header-search-subcategories-and-backlog E).
 */
export function buildCategorySubcategoryPath(
  category: SubcategoryParent,
  title: string
): string {
  const slug = toStickersSubcategorySlug(title)
  if (category === 'stickers') {
    if (!slug) return '/stickers'
    // Known destinations that must not be title-slugged away from dedicated routes
    const t = (title || '').trim().toLowerCase()
    if (t === 'bespoke labels' || t === 'custom') return '/stickers/custom'
    if (t.includes('stationery')) return '/stickers/stationery'
    if (t.includes('mixed')) return '/stickers/mixed-labels'
    return `/stickers/${slug}`
  }
  if (category === 'stamps') return '/stamp'
  if (category === 'phone-cases') return '/phone-cases'
  if (category === 'hot-goods') return '/hot-goods'
  return ''
}

/** Ensure leading `/`, fix legacy `/stamps` → `/stamp`, canonicalize sticker paths. */
export function normalizeSubcategoryLinkUrl(
  category: SubcategoryParent,
  title: string,
  linkUrl: string
): string {
  let raw = (linkUrl || '').trim()
  if (!raw) {
    return buildCategorySubcategoryPath(category, title)
  }
  if (!raw.startsWith('/')) {
    raw = `/${raw}`
  }
  // Legacy admin builder used plural /stamps — storefront hub is /stamp only
  raw = raw.replace(/^\/stamps(\/|$)/i, '/stamp$1')

  if (category === 'stickers') {
    return getStickersSubcategoryHref({ title, linkUrl: raw })
  }

  // Non-sticker parents: no [slug] routes yet — keep hub if path looks like a missing nested page
  if (category === 'stamps') {
    if (raw === '/stamp' || raw.startsWith('/stamp/')) return '/stamp'
    return raw.startsWith('/') ? raw : '/stamp'
  }
  if (category === 'phone-cases') {
    if (raw === '/phone-cases' || raw.startsWith('/phone-cases/')) return '/phone-cases'
    return raw
  }
  if (category === 'hot-goods') {
    if (raw === '/hot-goods' || raw.startsWith('/hot-goods/')) return '/hot-goods'
    return raw
  }
  return raw
}

/**
 * Persist-time / rehydrate hygiene for CMS subcategory linkUrl rows
 * (e.g. live "Stationery Essentials" → `stickers/Stationery` without leading slash).
 */
export function migrateSubcategoryLinkUrls<T extends SubcategoryItem>(items: T[]): T[] {
  if (!Array.isArray(items)) return items
  return items.map((item) => {
    const category = (item.category || 'stickers') as SubcategoryParent
    const next = normalizeSubcategoryLinkUrl(category, item.title || '', item.linkUrl || '')
    const prev = (item.linkUrl || '').trim()
    if (!next || next === prev) return item
    return {
      ...item,
      linkUrl: next,
      updatedAt: new Date(),
    } as T
  })
}
