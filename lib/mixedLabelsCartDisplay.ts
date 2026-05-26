import {
  isMixedLabelsCartCustomizations as isMixedLabelsOrderCustomizations,
} from '@/lib/mixedLabelsPricing'

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

export function getCartCustomizationDisplayEntries(
  customizations: Record<string, string>
): [string, string][] {
  if (isMixedLabelsOrderCustomizations(customizations)) {
    return getMixedLabelsCartDisplayLines(customizations).map((l) => [l.label, l.value])
  }
  return Object.entries(customizations).filter(
    ([key]) => !key.toLowerCase().includes('customizedimage') && !INTERNAL_KEYS.has(key.toLowerCase())
  )
}
