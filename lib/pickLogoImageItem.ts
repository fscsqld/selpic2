import type { ContentItem } from '@/lib/contentStore'

/**
 * Resolves the canonical Header "Logo Image" row when duplicates exist in contentItems.
 * Prefers: active + non-empty mediaUrl, then merge active row + any row that has mediaUrl
 * (fixes split state: `header-logo` active but empty, duplicate row holds `indexeddb://` URL).
 */
export function pickLogoImageItem(contentItems: ContentItem[]): ContentItem | undefined {
  const rows = contentItems.filter(
    (i) => i.section === 'header' && i.title === 'Logo Image'
  )
  if (rows.length === 0) return undefined
  if (rows.length === 1) return rows[0]

  const activeWithMedia = rows.find((i) => i.isActive && i.mediaUrl?.trim())
  if (activeWithMedia) return activeWithMedia

  const anyWithMedia = rows.find((i) => i.mediaUrl?.trim())
  const activeRow = rows.find((i) => i.isActive)
  if (anyWithMedia && activeRow) {
    return {
      ...activeRow,
      mediaUrl: anyWithMedia.mediaUrl,
      linkUrl: activeRow.linkUrl?.trim() || anyWithMedia.linkUrl?.trim() || '/',
    }
  }

  return rows.find((i) => i.isActive) || anyWithMedia || rows[0]
}

/**
 * Merges multiple "Logo Image" rows into one (prefers id `header-logo`) so CMS and header stay in sync.
 */
export function dedupeHeaderLogoImageItems(items: ContentItem[]): ContentItem[] {
  const logos = items.filter(
    (i) => i.section === 'header' && i.title === 'Logo Image'
  )
  if (logos.length <= 1) return items

  const keepId =
    logos.find((l) => l.id === 'header-logo')?.id ||
    logos.find((l) => l.isActive && l.mediaUrl?.trim())?.id ||
    logos.find((l) => l.mediaUrl?.trim())?.id ||
    logos.find((l) => l.isActive)?.id ||
    logos[0].id

  const mergedMedia =
    logos.find((l) => l.isActive && l.mediaUrl?.trim())?.mediaUrl?.trim() ||
    logos.find((l) => l.mediaUrl?.trim())?.mediaUrl?.trim() ||
    ''

  const linkSource =
    logos.find((l) => l.isActive && l.mediaUrl?.trim()) ||
    logos.find((l) => l.mediaUrl?.trim()) ||
    logos.find((l) => l.id === keepId) ||
    logos[0]
  const mergedLink = (linkSource?.linkUrl?.trim() || '/')

  const mergedActive = !!mergedMedia && logos.some((l) => l.isActive)

  const base = logos.find((l) => l.id === keepId) || logos[0]
  const merged: ContentItem = {
    ...base,
    id: keepId,
    mediaUrl: mergedMedia,
    linkUrl: mergedLink,
    isActive: mergedActive,
    updatedAt: new Date(),
  }

  const removeIds = new Set(
    logos.filter((l) => l.id !== keepId).map((l) => l.id)
  )
  return items
    .filter((i) => !removeIds.has(i.id))
    .map((i) => (i.id === keepId ? merged : i))
}
