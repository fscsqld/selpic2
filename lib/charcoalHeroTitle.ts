/** Stickers-length charcoal banner titles stay one line from `sm` up; wrap on phones so the left charcoal column stays. */
export const CHARCOAL_BANNER_ONE_LINE_TITLE_MAX = 32

export function charcoalBannerTitleOneLine(title: string): boolean {
  const t = (title || '').trim()
  return t.length > 0 && t.length <= CHARCOAL_BANNER_ONE_LINE_TITLE_MAX
}
