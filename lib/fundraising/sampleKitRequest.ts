/**
 * Personalised name-sticker sample (D5) — not a generic kit.
 * SELPIC prints a name the organisation nominates; there is no blank sample pack.
 * Match storefront one-line name stickers (`NAME_MAX_LETTERS` on /stickers/customize).
 */
export const SAMPLE_STICKER_PRINT_NAME_MAX = 9

export type NormalizedSampleKitRequest =
  | {
      ok: true
      sampleKitRequested: false
      sampleKitStatus: 'none'
      sampleKitPrintName?: undefined
    }
  | {
      ok: true
      sampleKitRequested: true
      sampleKitStatus: 'requested'
      sampleKitPrintName: string
    }
  | { ok: false; error: string }

export function isSampleKitRequestedFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'yes'
}

export function normalizeSampleKitPrintName(raw: unknown): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function printNameLength(name: string): number {
  return Array.from(name).length
}

/**
 * Apply / API invariant: never auto-request a sample.
 * Unchecked (or omitted) → none. Checked without a print name → error.
 * A leftover print name is ignored when the box is not checked.
 */
export function normalizeSampleKitRequest(input: {
  requested?: unknown
  printName?: unknown
}): NormalizedSampleKitRequest {
  const requested = isSampleKitRequestedFlag(input.requested)
  const printName = normalizeSampleKitPrintName(input.printName)
  if (!requested) {
    return { ok: true, sampleKitRequested: false, sampleKitStatus: 'none' }
  }
  if (!printName) {
    return {
      ok: false,
      error: 'Enter the name to print on the sample sticker (custom name labels cannot ship blank).',
    }
  }
  if (printNameLength(printName) > SAMPLE_STICKER_PRINT_NAME_MAX) {
    return {
      ok: false,
      error: `The sample print name must be ${SAMPLE_STICKER_PRINT_NAME_MAX} characters or fewer (same as our name stickers).`,
    }
  }
  return {
    ok: true,
    sampleKitRequested: true,
    sampleKitStatus: 'requested',
    sampleKitPrintName: printName,
  }
}

export function sampleKitDispatchPrintName(partner: {
  sampleKitPrintName?: string
  extraPrintName?: unknown
}): string {
  return (
    normalizeSampleKitPrintName(partner.sampleKitPrintName) ||
    normalizeSampleKitPrintName(partner.extraPrintName)
  )
}
