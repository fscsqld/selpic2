/**
 * Name-label sheet grid: label size (mm) and cols×rows per product size + subcategory.
 * Used by Sticker Customization preview and Admin → Sticker Management.
 */

export type StickerSheetLayout = {
  widthMm: number
  heightMm: number
  cols: number
  rows: number
  gapMm: number
}

const DEFAULT_GAP_MM = 2

/** Legacy size token → grid when size string has no explicit mm dimensions. */
const SIZE_TOKEN_GRID: Record<string, Omit<StickerSheetLayout, 'gapMm'>> = {
  'Extra Large': { widthMm: 45, heightMm: 21, cols: 2, rows: 6 },
  Large: { widthMm: 46, heightMm: 15, cols: 2, rows: 8 },
  /** Default Medium hologram (30×15mm), not Premium slim (30×13mm). */
  Medium: { widthMm: 30, heightMm: 15, cols: 3, rows: 8 },
  Small: { widthMm: 22, heightMm: 9, cols: 4, rows: 12 },
  Round: { widthMm: 28, heightMm: 28, cols: 3, rows: 4 },
  Mixed: { widthMm: 45, heightMm: 21, cols: 2, rows: 6 },
  혼합형: { widthMm: 45, heightMm: 21, cols: 2, rows: 6 },
  'Two Line': { widthMm: 45, heightMm: 21, cols: 2, rows: 6 },
  두줄: { widthMm: 45, heightMm: 21, cols: 2, rows: 6 },
}

export function parseLabelDimensionsFromSize(size: string): { widthMm?: number; heightMm?: number } {
  const compact = size.replace(/\s+/g, '')
  const m = compact.match(/(\d+(?:\.\d+)?)mm[x×](\d+(?:\.\d+)?)mm/i)
  if (!m) return {}
  const widthMm = Number(m[1])
  const heightMm = Number(m[2])
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return {}
  return { widthMm, heightMm }
}

export function isPremiumSubcategory(subcategory: string | undefined | null): boolean {
  return String(subcategory ?? '').trim().toLowerCase() === 'premium'
}

/** Medium 30×13mm: Basic 3×8 (24), Premium 3×9 (27). Medium 30×15mm: 3×8 (24). */
export function rowsForMediumSheet(
  widthMm: number,
  heightMm: number,
  subcategory: string | undefined | null
): number | undefined {
  if (widthMm !== 30) return undefined
  if (heightMm === 13) return isPremiumSubcategory(subcategory) ? 9 : 8
  if (heightMm === 15) return 8
  return undefined
}

/** Cols×rows from label mm (name-label sheet rules). */
export function gridForLabelDimensions(
  widthMm: number,
  heightMm: number,
  subcategory?: string | null
): { cols: number; rows: number } {
  if (widthMm >= 27 && widthMm <= 29 && heightMm >= 27 && heightMm <= 29) {
    return { cols: 3, rows: 4 }
  }
  if (widthMm === 22 && heightMm === 9) {
    return { cols: 4, rows: 12 }
  }
  if (widthMm === 30) {
    const rows = rowsForMediumSheet(30, heightMm, subcategory) ?? 8
    return { cols: 3, rows }
  }
  if ((widthMm === 46 || widthMm === 47) && (heightMm === 15 || heightMm === 16)) {
    return { cols: 2, rows: 8 }
  }
  if (widthMm === 45 && heightMm === 21) {
    return { cols: 2, rows: 6 }
  }
  if (widthMm >= 44 && heightMm >= 20) {
    return { cols: 2, rows: 6 }
  }
  if (widthMm >= 40) {
    return { cols: 2, rows: 8 }
  }
  if (widthMm >= 20) {
    return { cols: 4, rows: 12 }
  }
  return { cols: 3, rows: 8 }
}

export type StickerLayoutProductInput = {
  size?: string
  subcategory?: string
  stickerWidthMm?: number
  stickerHeightMm?: number
  stickerCols?: number
  stickerRows?: number
  stickerGapMm?: number
}

function hasExplicitStickerDims(p: StickerLayoutProductInput): boolean {
  return (
    typeof p.stickerWidthMm === 'number' &&
    Number.isFinite(p.stickerWidthMm) &&
    typeof p.stickerHeightMm === 'number' &&
    Number.isFinite(p.stickerHeightMm) &&
    typeof p.stickerCols === 'number' &&
    Number.isFinite(p.stickerCols) &&
    typeof p.stickerRows === 'number' &&
    Number.isFinite(p.stickerRows)
  )
}

function layoutFromExplicit(p: StickerLayoutProductInput): StickerSheetLayout {
  const gapMm = typeof p.stickerGapMm === 'number' && p.stickerGapMm >= 0 ? p.stickerGapMm : DEFAULT_GAP_MM
  let widthMm = p.stickerWidthMm!
  let heightMm = p.stickerHeightMm!
  let cols = p.stickerCols!
  let rows = p.stickerRows!

  const grid = gridForLabelDimensions(widthMm, heightMm, p.subcategory)
  cols = grid.cols
  rows = grid.rows

  return { widthMm, heightMm, cols, rows, gapMm }
}

function baseSizeToken(size: string): string {
  const s = size.trim()
  if (SIZE_TOKEN_GRID[s]) return s
  if (/extra\s*large|특대형/i.test(s)) return 'Extra Large'
  if (/^large|대형/i.test(s) && !/extra/i.test(s)) return 'Large'
  if (/^medium|중형/i.test(s)) return 'Medium'
  if (/^small|소형/i.test(s)) return 'Small'
  if (/round|원형/i.test(s)) return 'Round'
  return 'Medium'
}

function layoutFromSizeAndSubcategory(p: StickerLayoutProductInput): StickerSheetLayout {
  const gapMm = typeof p.stickerGapMm === 'number' && p.stickerGapMm >= 0 ? p.stickerGapMm : DEFAULT_GAP_MM
  const size = String(p.size ?? '').trim()
  const parsed = parseLabelDimensionsFromSize(size)

  if (parsed.widthMm != null && parsed.heightMm != null) {
    const { cols, rows } = gridForLabelDimensions(
      parsed.widthMm,
      parsed.heightMm,
      p.subcategory
    )
    return {
      widthMm: parsed.widthMm,
      heightMm: parsed.heightMm,
      cols,
      rows,
      gapMm,
    }
  }

  const token = baseSizeToken(size)
  const preset = SIZE_TOKEN_GRID[token] ?? SIZE_TOKEN_GRID.Medium
  return { ...preset, gapMm }
}

/** Single source of truth for customize preview grid and admin defaults. */
export function resolveStickerSheetLayout(product: StickerLayoutProductInput | null | undefined): StickerSheetLayout {
  if (!product) {
    return { ...SIZE_TOKEN_GRID.Medium, gapMm: DEFAULT_GAP_MM }
  }
  if (hasExplicitStickerDims(product)) {
    return layoutFromExplicit(product)
  }
  return layoutFromSizeAndSubcategory(product)
}

export function sheetContentDimensionsMm(layout: StickerSheetLayout): {
  contentWidthMm: number
  contentHeightMm: number
} {
  const { widthMm, heightMm, cols, rows, gapMm } = layout
  return {
    contentWidthMm: widthMm * cols + gapMm * (cols - 1),
    contentHeightMm: heightMm * rows + gapMm * (rows - 1),
  }
}

/** Admin form: apply size + subcategory → sticker mm fields. */
export function stickerPresetForAdminForm(
  size: string,
  subcategory: string
): Pick<StickerLayoutProductInput, 'stickerWidthMm' | 'stickerHeightMm' | 'stickerCols' | 'stickerRows' | 'stickerGapMm'> {
  const layout = resolveStickerSheetLayout({ size, subcategory })
  return {
    stickerWidthMm: layout.widthMm,
    stickerHeightMm: layout.heightMm,
    stickerCols: layout.cols,
    stickerRows: layout.rows,
    stickerGapMm: layout.gapMm,
  }
}
