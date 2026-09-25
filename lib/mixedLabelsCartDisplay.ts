import { getColorName } from './colorUtils'
import {
  isMixedLabelsCartCustomizations as isMixedLabelsOrderCustomizations,
} from './mixedLabelsPricing'

export { isMixedLabelsOrderCustomizations as isMixedLabelsCartCustomizations }

export type CustomizationDisplayLine = { label: string; value: string }
export type CustomizationDisplayAudience = 'customer' | 'admin'

/** Local check — avoid pulling stickerSheetBundles (and @/ layout) into this display helper. */
function isStickerPackCartCustomizations(
  customizations?: Record<string, string> | null
): boolean {
  if (!customizations || typeof customizations !== 'object') return false
  return Boolean(customizations.stickerSheetBundleId?.trim())
}

const INTERNAL_KEYS = new Set([
  'customizationmode',
  'mixedsheettemplateid',
  'producttype',
  'font',
  'color',
  'name',
  'text',
  'size',
  'mixedsheetbundleid',
  'mixedsheetbundlesheets',
  'mixedsheetbundleprice',
  'mixedsheetbundlelabel',
  'limitededitionnote',
  'stickersheetbundleid',
  'stickersheetbundlesheets',
  'stickersheetbundleprice',
  'stickersheetbundlelabel',
  'twolinesurchargeamount',
  'twolineoption',
  'bundletype',
  'settype',
])

function displayColourValue(raw: string): string {
  const v = raw.trim()
  if (!v) return v
  if (v.startsWith('#')) return getColorName(v)
  if (/^black$/i.test(v)) return 'Black'
  return v
}

/** Customer-facing font label (keep spelling; title-case first letter). */
function displayFontForCustomer(raw: string): string {
  const v = raw.trim()
  if (!v) return v
  return v.charAt(0).toUpperCase() + v.slice(1)
}

function mixedSheetCount(customizations: Record<string, string>): string | null {
  const sheets = customizations.mixedSheetBundleSheets?.trim()
  if (sheets) {
    const n = parseInt(sheets, 10)
    if (Number.isFinite(n) && n > 0) return String(n)
  }
  const label = customizations.mixedSheetBundleLabel?.trim()
  if (!label) return null
  const m = label.match(/(\d+)\s*sheet/i)
  if (m) return m[1]
  return label
}

function mixedSheetBundleCustomerLabel(customizations: Record<string, string>): string | null {
  const bundleLabel = customizations.mixedSheetBundleLabel?.trim()
  if (bundleLabel) return bundleLabel
  const sheets = mixedSheetCount(customizations)
  if (!sheets) return null
  const n = parseInt(sheets, 10)
  if (Number.isFinite(n) && n > 0) {
    return n === 1 ? '1 sheet' : `${n} sheets`
  }
  return sheets
}

/**
 * Customer-facing Mixed Labels lines (cart, order detail, emails).
 * Hides internal keys (productType, mode, ids, prices, long limited-edition note).
 */
export function getMixedLabelsCartDisplayLines(
  customizations: Record<string, string>
): CustomizationDisplayLine[] {
  const lines: CustomizationDisplayLine[] = []
  const name = (customizations.name || customizations.text || '').trim()
  if (name) lines.push({ label: 'Name', value: name })

  const font = customizations.font?.trim()
  if (font) lines.push({ label: 'Font', value: displayFontForCustomer(font) })

  const colour = customizations.color?.trim()
  if (colour) lines.push({ label: 'Colour', value: displayColourValue(colour) })

  const bundleLabel = mixedSheetBundleCustomerLabel(customizations)
  if (bundleLabel) lines.push({ label: 'Sheet bundle', value: bundleLabel })

  return lines
}

/**
 * Admin production block for Mixed Labels — print-ready fields only.
 */
export function getMixedLabelsAdminProductionLines(
  customizations: Record<string, string>
): CustomizationDisplayLine[] {
  const lines: CustomizationDisplayLine[] = []
  const name = (customizations.name || customizations.text || '').trim()
  if (name) lines.push({ label: 'Print name', value: name })

  const font = customizations.font?.trim()
  if (font) lines.push({ label: 'Font', value: font })

  const colour = customizations.color?.trim()
  if (colour) lines.push({ label: 'Colour', value: displayColourValue(colour) })

  const sheets = mixedSheetCount(customizations)
  if (sheets) lines.push({ label: 'Sheets', value: sheets })

  const templateId = customizations.mixedSheetTemplateId?.trim()
  if (templateId && templateId.toLowerCase() !== 'default') {
    lines.push({ label: 'Template', value: templateId })
  }

  return lines
}

export function getStickerPackCartDisplayLines(
  customizations: Record<string, string>
): CustomizationDisplayLine[] {
  const lines: CustomizationDisplayLine[] = []
  const bundleLabel = customizations.stickerSheetBundleLabel?.trim()
  const bundleSheets = customizations.stickerSheetBundleSheets?.trim()
  if (bundleLabel) {
    lines.push({ label: 'Pack size', value: bundleLabel })
  } else if (bundleSheets) {
    const n = parseInt(bundleSheets, 10)
    lines.push({
      label: 'Pack size',
      value: n === 1 ? '1 sheet per pack' : `${n} sheets per pack`,
    })
  }
  const twoLine = customizations.twoLineOption?.trim()
  if (twoLine) lines.push({ label: 'Text lines', value: twoLine })
  return lines
}

function getGenericCustomerDisplayLines(
  customizations: Record<string, string>
): CustomizationDisplayLine[] {
  const lines: CustomizationDisplayLine[] = []
  const text = (customizations.text || customizations.name || '').trim()
  if (text) lines.push({ label: 'Text', value: text })
  const font = customizations.font?.trim()
  if (font) lines.push({ label: 'Font', value: displayFontForCustomer(font) })
  const colour = customizations.color?.trim()
  if (colour) lines.push({ label: 'Colour', value: displayColourValue(colour) })
  const size = customizations.size?.trim()
  if (size) lines.push({ label: 'Size', value: size })

  for (const [key, raw] of Object.entries(customizations)) {
    if (!raw || typeof raw !== 'string') continue
    if (key.toLowerCase().includes('customizedimage')) continue
    if (INTERNAL_KEYS.has(key.toLowerCase())) continue
    const value = raw.trim()
    if (!value) continue
    lines.push({ label: key, value })
  }
  return lines
}

function getGenericAdminProductionLines(
  customizations: Record<string, string>
): CustomizationDisplayLine[] {
  const lines: CustomizationDisplayLine[] = []
  const name = (customizations.name || customizations.text || '').trim()
  if (name) lines.push({ label: 'Print name', value: name })
  const font = customizations.font?.trim()
  if (font) lines.push({ label: 'Font', value: font })
  const colour = customizations.color?.trim()
  if (colour) lines.push({ label: 'Colour', value: displayColourValue(colour) })
  const size = customizations.size?.trim()
  if (size) lines.push({ label: 'Size', value: size })

  if (isStickerPackCartCustomizations(customizations)) {
    lines.push(...getStickerPackCartDisplayLines(customizations))
  }

  for (const [key, raw] of Object.entries(customizations)) {
    if (!raw || typeof raw !== 'string') continue
    if (key.toLowerCase().includes('customizedimage')) continue
    if (INTERNAL_KEYS.has(key.toLowerCase())) continue
    const value = raw.trim()
    if (!value) continue
    lines.push({ label: key, value })
  }
  return lines
}

/** Customer cart / order / email personalization lines. */
export function getCartCustomizationDisplayEntries(
  customizations: Record<string, string>
): [string, string][] {
  return getOrderItemCustomizationDisplayLines(customizations, 'customer').map((l) => [
    l.label,
    l.value,
  ])
}

export function getOrderItemCustomizationDisplayLines(
  customizations: Record<string, string> | null | undefined,
  audience: CustomizationDisplayAudience = 'customer'
): CustomizationDisplayLine[] {
  if (!customizations || typeof customizations !== 'object') return []

  if (isMixedLabelsOrderCustomizations(customizations)) {
    return audience === 'admin'
      ? getMixedLabelsAdminProductionLines(customizations)
      : getMixedLabelsCartDisplayLines(customizations)
  }

  if (audience === 'admin') {
    return getGenericAdminProductionLines(customizations)
  }

  if (isStickerPackCartCustomizations(customizations)) {
    const packLines = getStickerPackCartDisplayLines(customizations)
    const core: CustomizationDisplayLine[] = []
    const text = (customizations.text || '').trim()
    if (text) core.push({ label: 'Text', value: text })
    const font = customizations.font?.trim()
    if (font) core.push({ label: 'Font', value: displayFontForCustomer(font) })
    const colour = customizations.color?.trim()
    if (colour) core.push({ label: 'Colour', value: displayColourValue(colour) })
    const rest = Object.entries(customizations)
      .filter(
        ([key]) =>
          !key.toLowerCase().includes('customizedimage') &&
          !INTERNAL_KEYS.has(key.toLowerCase())
      )
      .map(([key, value]) => ({ label: key, value: String(value).trim() }))
      .filter((l) => l.value)
    return [...packLines, ...core, ...rest]
  }

  return getGenericCustomerDisplayLines(customizations)
}

export function formatCustomizationDisplayPlain(
  lines: CustomizationDisplayLine[],
  indent = ''
): string {
  return lines.map((l) => `${indent}${l.label}: ${l.value}`).join('\n')
}

export function formatOrderItemPersonalizationPlain(
  customizations: Record<string, string> | null | undefined,
  audience: CustomizationDisplayAudience = 'customer',
  indent = ''
): string {
  return formatCustomizationDisplayPlain(
    getOrderItemCustomizationDisplayLines(customizations, audience),
    indent
  )
}

/** True when label should render a colour swatch (UI only). */
export function isCustomizationColourLabel(label: string): boolean {
  const k = label.toLowerCase()
  return k === 'color' || k === 'colour'
}

/**
 * Mixed Labels SKU size chip ("Mixed sheet…") duplicates Sheet bundle — hide on order UIs.
 */
export function shouldSuppressOrderMerchSizeChip(
  customizations: Record<string, string> | null | undefined
): boolean {
  return isMixedLabelsOrderCustomizations(customizations)
}

/**
 * Mixed Labels product.color chip duplicates Colour line — hide when personalization shows it.
 */
export function shouldSuppressOrderMerchColorChip(
  customizations: Record<string, string> | null | undefined
): boolean {
  if (!isMixedLabelsOrderCustomizations(customizations)) return false
  return Boolean(customizations?.color?.trim())
}
