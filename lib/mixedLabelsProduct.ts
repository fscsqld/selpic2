/** Admin / catalog helpers for Mixed Labels sticker products (one sheet, many shapes, name-only customize). */

import {
  DEFAULT_MIXED_LABELS_SHEET_BUNDLES,
  type MixedLabelsSheetBundle,
} from '@/lib/mixedLabelsPricing'

export const MIXED_LABELS_SUBCATEGORY = 'Mixed Labels'

export const MIXED_LABELS_CUSTOMIZATION_MODE = 'fixed-mixed-sheet' as const

export type MixedLabelsCustomizationMode = typeof MIXED_LABELS_CUSTOMIZATION_MODE

export function normalizeSubcategoryKey(value?: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
}

export function isMixedLabelsSubcategory(value?: string): boolean {
  return normalizeSubcategoryKey(value) === normalizeSubcategoryKey(MIXED_LABELS_SUBCATEGORY)
}

export function isMixedLabelsProduct(product: {
  subcategory?: string
  customizationMode?: string
}): boolean {
  return (
    product.customizationMode === MIXED_LABELS_CUSTOMIZATION_MODE ||
    isMixedLabelsSubcategory(product.subcategory)
  )
}

/** Storefront cap for mixed label name (characters, any script — same counting as Sticker Customization). */
export const MIXED_LABELS_STOREFRONT_NAME_MAX = 6

export function getMixedLabelsNameMaxLength(product?: {
  mixedLabelsNameMaxLength?: number
}): number {
  const n = Number(product?.mixedLabelsNameMaxLength)
  const configured =
    !Number.isFinite(n) || n < 1 ? DEFAULT_MIXED_LABELS_NAME_MAX_LENGTH : Math.floor(n)
  return Math.min(MIXED_LABELS_STOREFRONT_NAME_MAX, Math.max(1, configured))
}

/** Single line, max length — English, Korean, and other characters allowed (like Sticker Customization). */
export function sanitizeMixedLabelsNameInput(raw: string, maxLen: number): string {
  return raw.replace(/\n/g, '').slice(0, maxLen)
}

export function validateMixedLabelsName(
  name: string,
  maxLen: number
): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Please enter a name.' }
  if (trimmed.length > maxLen) {
    return { ok: false, error: `Maximum ${maxLen} characters.` }
  }
  return { ok: true }
}

export const DEFAULT_LIMITED_EDITION_TEXT =
  'Limited edition — artwork and layout are fixed. Only the name is customized.'

export const DEFAULT_MIXED_LABELS_NAME_MAX_LENGTH = 6

/**
 * Internal preview layout key (name overlay positions on the product image).
 * Admins do not need to set this — one default layout is used unless you add more in code.
 */
export const DEFAULT_MIXED_LABELS_TEMPLATE_ID = 'default'

export function resolveMixedSheetTemplateId(explicit?: string): string {
  const id = (explicit || '').trim().toLowerCase()
  return id || DEFAULT_MIXED_LABELS_TEMPLATE_ID
}

/** Admin Mixed Labels sheet panel — intro paragraph. */
export const MIXED_LABELS_ADMIN_SHEET_INTRO =
  'One printed sheet with multiple sticker shapes. Artwork and font are fixed — customers only enter a name on the customize page.'

/**
 * Admin note: not a repeating roll; assorted artwork is placed at random on each sheet.
 */
export const MIXED_LABELS_ADMIN_SHEET_RANDOM_NOTE =
  'Not a roll that repeats one image: each sheet includes many different related designs, placed at random across the sheet (not the same artwork over and over).'

/** Sticker admin forms currently support only black print/text color. */
export const STICKER_PRODUCT_COLOR = 'Black'

export function mixedLabelsFormDefaults(): {
  customizationMode: MixedLabelsCustomizationMode
  stickerSheetQuantity: number
  size: string
  color: string
  mixedSheetTemplateId: string
  mixedLabelsNameMaxLength: number
  mixedLabelsNameHint: string
  isLimitedEdition: boolean
  limitedEditionText: string
  mixedLabelsSheetBundles: MixedLabelsSheetBundle[]
} {
  return {
    customizationMode: MIXED_LABELS_CUSTOMIZATION_MODE,
    stickerSheetQuantity: 1,
    mixedLabelsSheetBundles: DEFAULT_MIXED_LABELS_SHEET_BUNDLES.map((b) => ({ ...b })),
    size: 'Mixed sheet (choose a sheet bundle)',
    color: STICKER_PRODUCT_COLOR,
    mixedSheetTemplateId: DEFAULT_MIXED_LABELS_TEMPLATE_ID,
    mixedLabelsNameMaxLength: DEFAULT_MIXED_LABELS_NAME_MAX_LENGTH,
    mixedLabelsNameHint:
      'Enter a name (English or Korean). Up to 6 characters. It prints on every sticker on the sheet.',
    isLimitedEdition: true,
    limitedEditionText: DEFAULT_LIMITED_EDITION_TEXT,
  }
}

/** Strip grid name-label fields when saving Mixed Labels products. */
export function stripGridNameLabelFields<T extends Record<string, unknown>>(product: T): T {
  const next = { ...product } as T & Record<string, unknown>
  delete next.stickerWidthMm
  delete next.stickerHeightMm
  delete next.stickerCols
  delete next.stickerRows
  delete next.stickerGapMm
  delete next.stickerHasImage
  delete next.twoLineSurcharge
  return next as T
}
