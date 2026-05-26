export type MixedLabelsSheetBundle = {
  id: string
  sheets: number
  price: number
  label?: string
}

export const DEFAULT_MIXED_LABELS_SHEET_BUNDLES: MixedLabelsSheetBundle[] = [
  { id: '1', sheets: 1, price: 2.99, label: '1 sheet' },
  { id: '2', sheets: 2, price: 5.5, label: '2 sheets' },
  { id: '4', sheets: 4, price: 9.99, label: '4 sheets' },
]

const MIXED_LABELS_CART_KEYS = {
  bundleId: 'mixedSheetBundleId',
  bundleSheets: 'mixedSheetBundleSheets',
  bundlePrice: 'mixedSheetBundlePrice',
  bundleLabel: 'mixedSheetBundleLabel',
} as const

export function mixedLabelsBundleCustomizationKeys() {
  return MIXED_LABELS_CART_KEYS
}

export function isMixedLabelsCartCustomizations(
  customizations?: Record<string, string> | null
): boolean {
  if (!customizations || typeof customizations !== 'object') return false
  return (
    customizations.productType === 'mixed-labels' ||
    customizations.customizationMode === 'fixed-mixed-sheet' ||
    Boolean(customizations[MIXED_LABELS_CART_KEYS.bundleId]?.trim())
  )
}

function stableBundleId(sheets: number, index: number): string {
  const n = Math.max(1, Math.floor(sheets))
  return String(n)
}

export function sanitizeMixedLabelsSheetBundles(raw: unknown): MixedLabelsSheetBundle[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MIXED_LABELS_SHEET_BUNDLES.map((b) => ({ ...b }))
  }
  const out: MixedLabelsSheetBundle[] = []
  const seenIds = new Set<string>()
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const sheets = Math.max(1, Math.floor(Number((entry as MixedLabelsSheetBundle).sheets) || 1))
    const price = Number((entry as MixedLabelsSheetBundle).price)
    if (!Number.isFinite(price) || price < 0) return
    let id = String((entry as MixedLabelsSheetBundle).id || '').trim()
    if (!id) id = stableBundleId(sheets, index)
    if (seenIds.has(id)) id = `${id}-${index}`
    seenIds.add(id)
    const labelRaw = (entry as MixedLabelsSheetBundle).label
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
  return out.length > 0 ? out : DEFAULT_MIXED_LABELS_SHEET_BUNDLES.map((b) => ({ ...b }))
}

export function getMixedLabelsSheetBundles(product?: {
  mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]
  price?: number
}): MixedLabelsSheetBundle[] {
  const fromProduct = sanitizeMixedLabelsSheetBundles(product?.mixedLabelsSheetBundles)
  if (fromProduct.length > 0) return fromProduct
  const base = Number(product?.price)
  if (Number.isFinite(base) && base >= 0) {
    return [{ id: '1', sheets: 1, price: Number(base.toFixed(2)), label: '1 sheet' }]
  }
  return DEFAULT_MIXED_LABELS_SHEET_BUNDLES.map((b) => ({ ...b }))
}

export function findMixedLabelsSheetBundle(
  bundles: MixedLabelsSheetBundle[],
  bundleId: string | undefined
): MixedLabelsSheetBundle | undefined {
  const id = (bundleId || '').trim()
  if (!id) return bundles[0]
  return bundles.find((b) => b.id === id) ?? bundles[0]
}

export function resolveMixedLabelsSheetBundle(
  product: { mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]; price?: number },
  customizations?: Record<string, string> | null
): MixedLabelsSheetBundle | null {
  if (!isMixedLabelsCartCustomizations(customizations)) return null
  const bundles = getMixedLabelsSheetBundles(product)
  const bundleId = customizations?.[MIXED_LABELS_CART_KEYS.bundleId]
  return findMixedLabelsSheetBundle(bundles, bundleId) ?? null
}

export function getMixedLabelsBundleUnitPrice(
  product: { mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]; price?: number },
  customizations?: Record<string, string> | null
): number | null {
  const bundle = resolveMixedLabelsSheetBundle(product, customizations)
  return bundle ? bundle.price : null
}

export function getMixedLabelsTotalSheets(
  bundle: MixedLabelsSheetBundle,
  orderQuantity: number
): number {
  const qty = Math.max(1, Math.floor(orderQuantity))
  return bundle.sheets * qty
}

export function formatMixedLabelsBundleOptionLabel(bundle: MixedLabelsSheetBundle): string {
  const label = bundle.label?.trim()
  if (label) return label
  return bundle.sheets === 1 ? '1 sheet' : `${bundle.sheets} sheets`
}

export function buildMixedLabelsBundleCustomizations(
  bundle: MixedLabelsSheetBundle,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    ...extra,
    [MIXED_LABELS_CART_KEYS.bundleId]: bundle.id,
    [MIXED_LABELS_CART_KEYS.bundleSheets]: String(bundle.sheets),
    [MIXED_LABELS_CART_KEYS.bundlePrice]: String(bundle.price),
    [MIXED_LABELS_CART_KEYS.bundleLabel]: formatMixedLabelsBundleOptionLabel(bundle),
  }
}
