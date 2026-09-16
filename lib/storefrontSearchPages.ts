import { getStickersSubcategoryHref, toStickersSubcategorySlug } from '@/lib/stickersSubcategoryHref'
import type { CategoryItem, SubcategoryItem, SidebarMenuItem } from '@/lib/contentStore'

export type StorefrontSearchPageHit = {
  id: string
  label: string
  href: string
  description?: string
  keywords: string[]
  /** Fixed site page vs CMS collection/subcategory */
  kind: 'page' | 'collection'
}

/** Customer-facing storefront pages (not admin / checkout / auth internals). */
const FIXED_STOREFRONT_PAGES: StorefrontSearchPageHit[] = [
  {
    id: 'page-fundraising',
    label: 'Fundraising',
    href: '/fundraising',
    description: 'School fundraising and partnerships',
    keywords: ['fundrais', 'school', 'partnership', 'raise', 'charity'],
    kind: 'page',
  },
  {
    id: 'page-community',
    label: 'Community',
    href: '/community',
    description: 'SELPIC N tips and conversation',
    keywords: ['community', 'selpic n', 'selpicn', 'tips', 'family'],
    kind: 'page',
  },
  {
    id: 'page-stickers',
    label: 'Stickers',
    href: '/stickers',
    description: 'Browse all sticker collections',
    keywords: ['sticker', 'labels', 'name label'],
    kind: 'page',
  },
  {
    id: 'page-hot-goods',
    label: 'Market S',
    href: '/hot-goods',
    description: 'Trending and limited edition items',
    keywords: ['market s', 'markets', 'hot goods', 'hotgoods', 'limited', 'trending'],
    kind: 'page',
  },
  {
    id: 'page-custom-design',
    label: 'Custom Design',
    href: '/custom-design',
    description: 'Create your own unique products',
    keywords: ['custom design', 'bespoke', 'design'],
    kind: 'page',
  },
  {
    id: 'page-about',
    label: 'About',
    href: '/about',
    description: 'About Selpic',
    keywords: ['about', 'company', 'who we are'],
    kind: 'page',
  },
  {
    id: 'page-contact',
    label: 'Contact',
    href: '/contact',
    description: 'Contact support',
    keywords: ['contact', 'email', 'support', 'help desk'],
    kind: 'page',
  },
  {
    id: 'page-help',
    label: 'Help',
    href: '/help',
    description: 'Help Center',
    keywords: ['help', 'faq', 'support'],
    kind: 'page',
  },
  {
    id: 'page-privacy',
    label: 'Privacy Policy',
    href: '/privacy',
    description: 'Privacy Policy',
    keywords: ['privacy', 'privacy policy'],
    kind: 'page',
  },
  {
    id: 'page-terms',
    label: 'Terms and Conditions',
    href: '/terms',
    description: 'Terms and Conditions',
    keywords: ['terms', 'conditions', 'tos'],
    kind: 'page',
  },
  {
    id: 'page-refund',
    label: 'Refund Policy',
    href: '/refund',
    description: 'Refund Policy',
    keywords: ['refund', 'return', 'returns'],
    kind: 'page',
  },
  {
    id: 'page-promo-codes',
    label: 'Promo Codes',
    href: '/promo-codes',
    description: 'Promo and discount codes',
    keywords: ['promo', 'coupon', 'discount', 'voucher'],
    kind: 'page',
  },
  {
    id: 'page-benefits',
    label: 'Benefits',
    href: '/benefits',
    description: 'Member benefits',
    keywords: ['benefits', 'member', 'rewards'],
    kind: 'page',
  },
  {
    id: 'page-cart',
    label: 'Cart',
    href: '/cart',
    description: 'Shopping cart',
    keywords: ['cart', 'bag', 'basket'],
    kind: 'page',
  },
  {
    id: 'page-login',
    label: 'Login',
    href: '/login',
    description: 'Sign in',
    keywords: ['login', 'sign in', 'signin', 'account'],
    kind: 'page',
  },
]

const EXCLUDED_HREF_PREFIXES = ['/admin', '/api', '/auth', '/checkout', '/success', '/test']
const EXCLUDED_HREFS = new Set([
  '/reset-password',
  '/forgot-password',
  '/unsubscribe',
  '/register',
  '/orders',
  '/profile',
  '/tetris',
])

function isAllowedHref(href: string): boolean {
  const h = (href || '').trim()
  if (!h.startsWith('/')) return false
  if (EXCLUDED_HREFS.has(h)) return false
  if (EXCLUDED_HREF_PREFIXES.some((p) => h === p || h.startsWith(`${p}/`))) return false
  return true
}

function uniqKeywords(...parts: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const t = (part || '').trim().toLowerCase()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function normalizePublicHref(raw: string): string {
  let h = (raw || '').trim()
  if (!h) return ''
  if (!h.startsWith('/')) h = `/${h}`
  // Drop hash/query for search destinations
  h = h.split('#')[0].split('?')[0]
  return h
}

/**
 * Build searchable storefront pages + active sticker (and gated) subcategory collections.
 * Call from client with live CMS arrays from contentStore.
 */
export function buildStorefrontSearchPages(input: {
  subcategoryItems?: SubcategoryItem[] | null
  categoryItems?: CategoryItem[] | null
  sidebarMenuItems?: SidebarMenuItem[] | null
}): StorefrontSearchPageHit[] {
  const byHref = new Map<string, StorefrontSearchPageHit>()

  const add = (hit: StorefrontSearchPageHit) => {
    if (!isAllowedHref(hit.href)) return
    const existing = byHref.get(hit.href)
    if (existing) {
      existing.keywords = uniqKeywords(...existing.keywords, ...hit.keywords, hit.label, existing.label)
      if (!existing.description && hit.description) existing.description = hit.description
      return
    }
    byHref.set(hit.href, {
      ...hit,
      keywords: uniqKeywords(...hit.keywords, hit.label, hit.description),
    })
  }

  for (const page of FIXED_STOREFRONT_PAGES) {
    add(page)
  }

  const allCategories = input.categoryItems || []
  const activeCategories = allCategories.filter((c) => c.isActive)

  const parentTileActive = (
    match: (c: CategoryItem) => boolean
  ): boolean => {
    const rows = allCategories.filter(match)
    if (rows.length === 0) return true // no CMS gate → allow active subcategories
    return rows.some((c) => c.isActive)
  }

  const parentStickersActive = parentTileActive(
    (c) =>
      (c.linkUrl || '').includes('/stickers') ||
      (c.title || '').toLowerCase() === 'stickers'
  )
  const parentStampsActive = parentTileActive(
    (c) =>
      (c.linkUrl || '').includes('/stamp') ||
      (c.title || '').toLowerCase().includes('stamp')
  )
  const parentPhoneActive = parentTileActive(
    (c) =>
      (c.linkUrl || '').includes('phone') ||
      (c.title || '').toLowerCase().includes('phone')
  )

  for (const cat of activeCategories) {
    const href = normalizePublicHref(cat.linkUrl || '')
    if (!href || !isAllowedHref(href)) continue
    add({
      id: `category-${cat.id}`,
      label: (cat.title || '').trim() || href,
      href,
      description: cat.description,
      keywords: uniqKeywords(cat.title, cat.description, cat.linkUrl),
      kind: 'collection',
    })
  }

  const subs = (input.subcategoryItems || []).filter((s) => s.isActive)
  for (const sub of subs) {
    const parent = sub.category
    if (parent === 'stickers' && !parentStickersActive) continue
    if (parent === 'stamps' && !parentStampsActive) continue
    if (parent === 'phone-cases' && !parentPhoneActive) continue

    let href =
      parent === 'stickers'
        ? getStickersSubcategoryHref(sub)
        : normalizePublicHref(sub.linkUrl || '')

    if (!href) {
      const slug = toStickersSubcategorySlug(sub.title)
      if (parent === 'stickers' && slug) href = `/stickers/${slug}`
    }
    if (!href || !isAllowedHref(href)) continue

    add({
      id: `sub-${sub.id}`,
      label: (sub.title || '').trim() || href,
      href,
      description: sub.description || sub.pageSubtitle,
      keywords: uniqKeywords(
        sub.title,
        sub.description,
        sub.pageTitle,
        sub.pageSubtitle,
        sub.linkUrl,
        toStickersSubcategorySlug(sub.title)
      ),
      kind: 'collection',
    })
  }

  // Active sidebar link rows (extra nav destinations)
  for (const item of input.sidebarMenuItems || []) {
    if (!item.isActive || item.type !== 'link') continue
    const href = normalizePublicHref(item.url || '')
    if (!href || !isAllowedHref(href)) continue
    add({
      id: `sidebar-${item.id}`,
      label: (item.title || '').trim() || href,
      href,
      keywords: uniqKeywords(item.title, item.url),
      kind: 'page',
    })
  }

  return Array.from(byHref.values()).sort((a, b) => a.label.localeCompare(b.label))
}

export function filterStorefrontSearchPages(
  pages: StorefrontSearchPageHit[],
  query: string
): StorefrontSearchPageHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return pages.filter((page) => {
    if (page.label.toLowerCase().includes(q)) return true
    if ((page.description || '').toLowerCase().includes(q)) return true
    return page.keywords.some((k) => k.includes(q) || q.includes(k))
  })
}

/** Prefer exact label match, else first hit. */
export function pickBestStorefrontSearchPage(
  matches: StorefrontSearchPageHit[],
  query: string
): StorefrontSearchPageHit | null {
  if (matches.length === 0) return null
  const q = query.trim().toLowerCase()
  const exact = matches.find((p) => p.label.trim().toLowerCase() === q)
  return exact || matches[0]
}
