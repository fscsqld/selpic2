/**
 * Australian Business Number (ABN) helpers.
 * 11 digits; checksum per ABR weighting (not legal advice).
 */

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const

export function digitsOnlyAbn(value: string): string {
  return String(value || '').replace(/\D/g, '')
}

/** Format as "XX XXX XXX XXX" when 11 digits present. */
export function formatAbnDisplay(value: string | undefined | null): string {
  const d = digitsOnlyAbn(value || '')
  if (d.length !== 11) return String(value || '').trim()
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`
}

export function maskAbn(value: string | undefined | null): string {
  const d = digitsOnlyAbn(value || '')
  if (d.length !== 11) return 'ABN ** *** *** ***'
  // Show first 5 digits, mask the rest (e.g. ABN 98 765 *** ***)
  return `ABN ${d.slice(0, 2)} ${d.slice(2, 5)} *** ***`
}

/** Returns true when 11 digits and ABR checksum passes. */
export function isValidAbn(value: string | undefined | null): boolean {
  const d = digitsOnlyAbn(value || '')
  if (d.length !== 11) return false
  const digits = d.split('').map((c) => Number(c))
  digits[0] = digits[0] - 1
  const sum = digits.reduce((acc, n, i) => acc + n * ABN_WEIGHTS[i], 0)
  return sum % 89 === 0
}

export function abnValidationError(value: string | undefined | null): string | null {
  const d = digitsOnlyAbn(value || '')
  if (!d) return 'ABN is required.'
  if (d.length !== 11) return 'ABN must be exactly 11 digits.'
  if (!isValidAbn(d)) return 'ABN failed checksum validation. Please check the number.'
  return null
}
