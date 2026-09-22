/** Storefront Shop by Category card overlay. CMS keys stay; UI chrome is gated. */

const NON_CATALOG_HOME_TITLES = new Set(['Custom Design', 'SELPIC N'])

export function homepageCategoryCardEmoji(emoji: string | undefined | null): string {
  return (emoji || '').trim()
}

export function newParentCategoryChrome(): { emoji: string; tags: string[] } {
  return { emoji: '', tags: [] }
}

export function homepageCategoryCardTags(tags: string[] | undefined | null): string[] {
  if (!Array.isArray(tags)) return []
  return tags.map((tag) => String(tag).trim()).filter(Boolean)
}

export function shouldShowHomepageCategoryProductCount(
  title: string | undefined | null,
  count: number
): boolean {
  if (!Number.isFinite(count) || count <= 0) return false
  const name = (title || '').trim()
  if (!name || NON_CATALOG_HOME_TITLES.has(name)) return false
  return true
}
