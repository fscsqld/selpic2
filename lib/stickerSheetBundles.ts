import {
  resolveStickerSheetLayout,
  type StickerLayoutProductInput,
} from '@/lib/stickerSheetLayout'

export type StickerSheetBundle = {
  id: string
  sheets: number
  price: number
  label?: string
}

const STICKER_PACK_CART_KEYS = {
  bundleId: 'stickerSheetBundleId',
  bundleSheets: 'stickerSheetBundleSheets',
  bundlePrice: 'stickerSheetBundlePrice',
  bundleLabel: 'stickerSheetBundleLabel',
} as const

export function stickerPackCartKeys() {
  return STICKER_PACK_CART_KEYS
}

export function getLabelsPerSheetFromProduct(
  product: StickerLayoutProductInput | null | undefined
): number {
  const layout = resolveStickerSheetLayout(product)
  return Math.max(1, layout.cols * layout.rows)
}

export function formatStickerPackLabel(sheets: number, labelsPerSheet: number): string {
  const n = Math.max(1, Math.floor(sheets))
  const labels = labelsPerSheet * n
  const sheetWord = n === 1 ? 'sheet' : 'sheets'
  return `${labels} labels (${n} ${sheetWord})`
}

export function sanitizeStickerSheetBundles(raw: unknown): StickerSheetBundle[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: StickerSheetBundle[] = []
  const seenIds = new Set<string>()
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const sheets = Math.max(1, Math.floor(Number((entry as StickerSheetBundle).sheets) || 1))
    const price = Number((entry as StickerSheetBundle).price)
    if (!Number.isFinite(price) || price < 0) return
    let id = String((entry as StickerSheetBundle).id || '').trim()
    if (!id) id = String(sheets)
    if (seenIds.has(id)) id = `${id}-${index}`
    seenIds.add(id)
    const labelRaw = (entry as StickerSheetBundle).label
    const label =
      typeof labelRaw === 'string' && labelRaw.trim()
        ? labelRaw.trim().slice(0, 80)
        : sheets === 1
          ? '1 sheet'
          : `${sheets} sheets`
    out.push({
      id,
      sheets,
      price: Number(price.toFixed(2)),
      label,
    })
  })
  out.sort((a, b) => a.sheets - b.sheets)
  return out
}

export function productHasStickerPackOptions(product?: {
  enableStickerPackOptions?: boolean
  stickerSheetBundles?: StickerSheetBundle[]
} | null): boolean {
  if (!product) return false
  if (product.enableStickerPackOptions === false) return false
  const bundles = sanitizeStickerSheetBundles(product.stickerSheetBundles)
  return product.enableStickerPackOptions === true && bundles.length > 0
}

export function getStickerSheetBundles(product?: {
  enableStickerPackOptions?: boolean
  stickerSheetBundles?: StickerSheetBundle[]
}): StickerSheetBundle[] {
  if (!productHasStickerPackOptions(product)) return []
  return sanitizeStickerSheetBundles(product?.stickerSheetBundles)
}

export function findStickerSheetBundle(
  bundles: StickerSheetBundle[],
  bundleId: string | undefined
): StickerSheetBundle | undefined {
  const id = (bundleId || '').trim()
  if (!id) return bundles[0]
  return bundles.find((b) => b.id === id) ?? bundles[0]
}

export function isStickerPackCartCustomizations(
  customizations?: Record<string, string> | null
): boolean {
  if (!customizations || typeof customizations !== 'object') return false
  return Boolean(customizations[STICKER_PACK_CART_KEYS.bundleId]?.trim())
}

export function resolveStickerSheetBundle(
  product: {
    enableStickerPackOptions?: boolean
    stickerSheetBundles?: StickerSheetBundle[]
  },
  customizations?: Record<string, string> | null
): StickerSheetBundle | null {
  if (!isStickerPackCartCustomizations(customizations)) return null
  const bundles = getStickerSheetBundles(product)
  if (bundles.length === 0) return null
  const bundleId = customizations?.[STICKER_PACK_CART_KEYS.bundleId]
  return findStickerSheetBundle(bundles, bundleId) ?? null
}

export function formatStickerPackOptionLabel(bundle: StickerSheetBundle): string {
  const label = bundle.label?.trim()
  if (label) return label
  return bundle.sheets === 1 ? '1 sheet' : `${bundle.sheets} sheets`
}

export function buildStickerSheetBundleCustomizations(
  bundle: StickerSheetBundle,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    ...extra,
    [STICKER_PACK_CART_KEYS.bundleId]: bundle.id,
    [STICKER_PACK_CART_KEYS.bundleSheets]: String(bundle.sheets),
    [STICKER_PACK_CART_KEYS.bundlePrice]: String(bundle.price),
    [STICKER_PACK_CART_KEYS.bundleLabel]: formatStickerPackOptionLabel(bundle),
  }
}

/** Admin: suggest 1/2/3-sheet packs with label counts from product grid. Prices left at 0 for admin to fill. */
export function buildSuggestedStickerPacks(
  product: StickerLayoutProductInput,
  sheetCounts: number[] = [1, 2, 3]
): StickerSheetBundle[] {
  const labelsPerSheet = getLabelsPerSheetFromProduct(product)
  return sheetCounts
    .map((sheets) => Math.max(1, Math.floor(sheets)))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .sort((a, b) => a - b)
    .map((sheets) => ({
      id: String(sheets),
      sheets,
      price: 0,
      label: formatStickerPackLabel(sheets, labelsPerSheet),
    }))
}

export function getStickerPackTotalSheets(
  bundle: StickerSheetBundle,
  orderQuantity: number
): number {
  const qty = Math.max(1, Math.floor(orderQuantity))
  return bundle.sheets * qty
}
