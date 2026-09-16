/**
 * Normalize sticker subcategory CMS linkUrl / title → storefront href.
 * Shared by /stickers cards and Header search (handles missing leading `/`).
 */
export function toStickersSubcategorySlug(value: string): string {
  return decodeURIComponent(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getStickersSubcategoryHref(item: { title: string; linkUrl: string }): string {
  let raw = (item.linkUrl || '').trim()
  if (raw && !raw.startsWith('/')) {
    raw = `/${raw}`
  }
  if (raw === '/stickers') return '/stickers'
  if (raw.startsWith('/stickers/')) {
    const segment = raw.split('/').filter(Boolean).pop() || ''
    const normalized = toStickersSubcategorySlug(segment)
    if (normalized) return `/stickers/${normalized}`
  }
  const fallback = toStickersSubcategorySlug(item.title)
  return fallback ? `/stickers/${fallback}` : '/stickers'
}
