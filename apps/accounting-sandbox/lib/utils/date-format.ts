/**
 * Date Formatting Utilities
 *
 * Australian display format DD/MM/YYYY. Always normalise via toIsoDateString
 * so OCR years (267 → 2026) never render as year 267.
 */

import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

/**
 * Format date to DD/MM/YYYY (Australian format)
 */
export function formatDateAustralian(dateStr: string): string {
  if (!dateStr) return ''

  try {
    const iso = toIsoDateString(dateStr)
    if (iso) {
      const [year, month, day] = iso.split('-')
      return `${day}/${month}/${year}`
    }

    if (dateStr.includes('/') && dateStr.split('/').length === 3) {
      return dateStr
    }

    return dateStr
  } catch (error) {
    console.error('[Date Format] Error formatting date:', dateStr, error)
    return dateStr
  }
}

/**
 * Format date from Date object to DD/MM/YYYY (Australian format)
 */
export function formatDateObjectAustralian(date: Date): string {
  if (!date || isNaN(date.getTime())) return ''

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Value for input type="date" (YYYY-MM-DD), with OCR repair. */
export function toDateInputValue(dateStr: string): string {
  return toIsoDateString(dateStr) || ''
}
