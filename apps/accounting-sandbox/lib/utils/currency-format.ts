/**
 * Currency Formatting Utilities
 * 
 * Formats numbers as currency with thousand separators
 * Example: 1234.56 → "$1,234.56"
 */

/**
 * Format a number as currency with thousand separators
 * @param amount - The amount to format
 * @param showCurrency - Whether to include the $ symbol (default: true)
 * @returns Formatted string (e.g., "$1,234.56" or "1,234.56")
 */
export function formatCurrency(amount: number | null | undefined, showCurrency: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showCurrency ? '$0.00' : '0.00'
  }

  // Avoid "$-0.00" from IEEE signed zero (e.g. March bank recon Difference)
  const normalized = amount + 0 === 0 ? 0 : amount

  const formatted = normalized.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return showCurrency ? `$${formatted}` : formatted
}

/**
 * Format a number as currency without the $ symbol
 * @param amount - The amount to format
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatCurrencyNoSymbol(amount: number | null | undefined): string {
  return formatCurrency(amount, false)
}

/**
 * Parse a user-entered amount (accepts $, commas, spaces). Empty → 0.
 * Returns null when the value is not a finite non-negative number.
 */
export function parseCurrencyInput(raw: string): number | null {
  const cleaned = String(raw ?? '')
    .replace(/[$,\s]/g, '')
    .trim()
  if (cleaned === '') return 0
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Draft value for an amount input (no $). */
export function toAmountInputValue(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return ''
  }
  return amount.toFixed(2)
}

/** Round to cents (half-up via integer cents). Normalises -0 → 0. */
export function roundMoney(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return 0
  const n = Math.round(amount * 100) / 100
  return n === 0 ? 0 : n
}

