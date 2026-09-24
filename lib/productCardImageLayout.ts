/** Stickers hub matches Market S cards; subcategory grids keep compact 240px thumbs. */
export const PRODUCT_CARD_IMAGE_LAYOUTS = ['compact', 'full'] as const

export type ProductCardImageLayout = (typeof PRODUCT_CARD_IMAGE_LAYOUTS)[number]

export function resolveProductCardImageLayout(
  value: string | null | undefined
): ProductCardImageLayout {
  return value === 'full' ? 'full' : 'compact'
}

/** Hub cards: only show stars when admin saved a real rating (never invent 4.8). */
export function productCardHasCatalogRating(rating: unknown): boolean {
  return typeof rating === 'number' && Number.isFinite(rating) && rating > 0
}
