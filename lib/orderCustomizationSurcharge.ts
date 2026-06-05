/**
 * Per-unit customization surcharges (e.g. 2-line name labels) — must match checkout logic.
 * Amounts are GST-inclusive (AUD) and added on top of catalogue unit price.
 */

/** GST-inclusive AUD; used when product has no admin `twoLineSurcharge`. */
export const TWO_LINE_SURCHARGE_DEFAULT = 1
const TWO_LINE_SIZE_VALUES = ['large', 'extra large', 'medium', '대형', '특대형', '중형']

function parseSurchargeFromValue(value: string): number {
  if (typeof value !== 'string') return 0
  const match = value.match(/\+\s*\$\s*([\d.]+)/)
  if (!match) return 0
  const n = parseFloat(match[1])
  return !isNaN(n) && isFinite(n) ? n : 0
}

export function getCustomizationSurchargePerUnit(
  customizations: Record<string, string> | undefined,
  product?: { size?: string }
): number {
  if (!customizations || typeof customizations !== 'object') return 0
  const explicit = customizations.twoLineSurchargeAmount
  if (explicit != null && String(explicit).trim() !== '') {
    const n = parseFloat(String(explicit).trim())
    if (!isNaN(n) && isFinite(n) && n >= 0) return n
  }
  const twoLineOpt = customizations.twoLineOption
  if (typeof twoLineOpt === 'string' && twoLineOpt.trim()) {
    const m = twoLineOpt.match(/\+\s*\$?\s*([\d.]+)/)
    if (m) {
      const n = parseFloat(m[1])
      if (!isNaN(n) && isFinite(n) && n >= 0) return n
    }
  }
  const fromEntries = Object.entries(customizations)
    .filter(([key]) => !key.toLowerCase().includes('customizedimage'))
    .reduce((sum, [, value]) => sum + parseSurchargeFromValue(String(value)), 0)
  if (fromEntries > 0) return fromEntries
  const text = customizations.text
  const hasTwoLineText = typeof text === 'string' && text.includes('\n')
  const sizeNorm = product?.size ? String(product.size).trim().toLowerCase() : ''
  const sizeSupportsTwo = TWO_LINE_SIZE_VALUES.includes(sizeNorm)
  if (hasTwoLineText && sizeSupportsTwo) return TWO_LINE_SURCHARGE_DEFAULT
  return 0
}

export function getCustomizationSurchargeLabel(
  customizations: Record<string, string> | undefined,
  product?: { size?: string }
): string {
  if (!customizations || typeof customizations !== 'object') return 'Custom options'

  const explicit = customizations.twoLineSurchargeAmount
  if (explicit != null && String(explicit).trim() !== '') return 'Two-line text'

  const twoLineOpt = customizations.twoLineOption
  if (typeof twoLineOpt === 'string' && twoLineOpt.trim()) return 'Two-line text'

  // Fallback: if user entered multi-line text and the selected size supports it
  const text = customizations.text
  const hasTwoLineText = typeof text === 'string' && text.includes('\n')
  const sizeNorm = product?.size ? String(product.size).trim().toLowerCase() : ''
  const sizeSupportsTwo = TWO_LINE_SIZE_VALUES.includes(sizeNorm)
  if (hasTwoLineText && sizeSupportsTwo) return 'Two-line text'

  // Otherwise keep it generic
  return 'Custom options'
}
