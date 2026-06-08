import {
  isMixedLabelsCartCustomizations as isMixedLabelsOrderCustomizations,
} from '@/lib/mixedLabelsPricing'
import { isStickerPackCartCustomizations } from '@/lib/stickerSheetBundles'

export { isMixedLabelsOrderCustomizations as isMixedLabelsCartCustomizations }

const INTERNAL_KEYS = new Set([
  'customizationmode',
  'mixedsheettemplateid',
  'producttype',
  'font',
  'color',
  'mixedsheetbundleid',
  'mixedsheetbundlesheets',
  'mixedsheetbundleprice',
  'limitededitionnote',
  'stickersheetbundleid',
  'stickersheetbundlesheets',
  'stickersheetbundleprice',
  'twolinesurchargeamount',
  'twolineoption',
])

export function getMixedLabelsCartDisplayLines(
  customizations: Record<string, string>
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []
  const name = (customizations.name || customizations.text || '').trim()
  if (name) lines.push({ label: 'Name', value: name })

  const bundleLabel = customizations.mixedSheetBundleLabel?.trim()
  const bundleSheets = customizations.mixedSheetBundleSheets?.trim()
  if (bundleLabel) {
    lines.push({ label: 'Sheet bundle', value: bundleLabel })
  } else if (bundleSheets) {
    const n = parseInt(bundleSheets, 10)
    lines.push({
      label: 'Sheet bundle',
      value: n === 1 ? '1 sheet per pack' : `${n} sheets per pack`,
    })
  }

  const note = customizations.limitedEditionNote?.trim()
  if (note) lines.push({ label: 'Note', value: note })

  return lines
}

export function getStickerPackCartDisplayLines(
  customizations: Record<string, string>
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []
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

export function getCartCustomizationDisplayEntries(
  customizations: Record<string, string>
): [string, string][] {
  if (isMixedLabelsOrderCustomizations(customizations)) {
    return getMixedLabelsCartDisplayLines(customizations).map((l) => [l.label, l.value])
  }
  if (isStickerPackCartCustomizations(customizations)) {
    const packLines = getStickerPackCartDisplayLines(customizations)
    const rest = Object.entries(customizations).filter(
      ([key]) =>
        !key.toLowerCase().includes('customizedimage') &&
        !INTERNAL_KEYS.has(key.toLowerCase()) &&
        !['text', 'font', 'color', 'size'].includes(key.toLowerCase())
    )
    const core: [string, string][] = []
    const text = (customizations.text || '').trim()
    if (text) core.push(['Text', text])
    const font = customizations.font?.trim()
    if (font) core.push(['Font', font])
    return [...packLines.map((l) => [l.label, l.value] as [string, string]), ...core, ...rest]
  }
  return Object.entries(customizations).filter(
    ([key]) => !key.toLowerCase().includes('customizedimage') && !INTERNAL_KEYS.has(key.toLowerCase())
  )
}
