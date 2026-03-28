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

  const formatted = amount.toLocaleString('en-US', {
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

