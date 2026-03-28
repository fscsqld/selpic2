/**
 * Formatting utilities for currency, dates, and numbers
 * Used across admin panel and customer-facing pages
 */

export type Currency = 'USD' | 'KRW' | 'EUR' | 'GBP' | 'AUD' | 'JPY' | 'CNY'
export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD MMM YYYY' | 'YYYY년 MM월 DD일'
export type Timezone = 
  | 'Asia/Seoul' 
  | 'America/New_York' 
  | 'America/Los_Angeles' 
  | 'Europe/London' 
  | 'Europe/Paris'
  | 'Australia/Sydney'
  | 'Australia/Melbourne'
  | 'Australia/Brisbane'
  | 'Asia/Tokyo'
  | 'Asia/Shanghai'
  | 'UTC'

// Currency symbols and formatting
const currencyInfo: Record<Currency, { symbol: string; locale: string; decimals: number }> = {
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  KRW: { symbol: '₩', locale: 'ko-KR', decimals: 0 },
  EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
  AUD: { symbol: 'A$', locale: 'en-AU', decimals: 2 },
  JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0 },
  CNY: { symbol: '¥', locale: 'zh-CN', decimals: 2 },
}

/**
 * Format currency amount
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'USD',
  options?: {
    showSymbol?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  const info = currencyInfo[currency]
  const formatter = new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? info.decimals,
    maximumFractionDigits: options?.maximumFractionDigits ?? info.decimals,
  })

  if (options?.showSymbol === false) {
    // Return without symbol if requested
    return formatter.format(amount).replace(/[^\d.,\s-]/g, '')
  }

  return formatter.format(amount)
}

/**
 * Format date according to specified format
 * @param date - Date object or ISO string
 * @param format - Date format pattern
 * @param timezone - Optional timezone (default: browser local)
 */
export function formatDate(
  date: Date | string,
  format: DateFormat = 'YYYY-MM-DD',
  timezone?: Timezone
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return '-'
  }

  // If timezone is specified, convert to that timezone
  if (timezone) {
    return formatDateWithTimezone(d, format, timezone)
  }

  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    case 'MM/DD/YYYY':
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    case 'DD/MM/YYYY':
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    case 'DD MMM YYYY': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`
    }
    case 'YYYY년 MM월 DD일': {
      return `${year}년 ${month}월 ${day}일`
    }
    default:
      return d.toLocaleDateString()
  }
}

/**
 * Format date with timezone
 * @param date - Date object or ISO string
 * @param format - Date format pattern
 * @param timezone - Timezone
 */
export function formatDateWithTimezone(
  date: Date | string,
  format: DateFormat = 'YYYY-MM-DD',
  timezone: Timezone
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return '-'
  }

  // Convert to specified timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(d)
  const year = parts.find(p => p.type === 'year')?.value || ''
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'DD MMM YYYY': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${day} ${months[parseInt(month) - 1]} ${year}`
    }
    case 'YYYY년 MM월 DD일': {
      return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`
    }
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * Format date and time
 * @param date - Date object or ISO string
 * @param format - Date format pattern
 * @param timezone - Optional timezone
 * @param includeTime - Whether to include time (default: true)
 */
export function formatDateTime(
  date: Date | string,
  format: DateFormat = 'YYYY-MM-DD',
  timezone?: Timezone,
  includeTime: boolean = true
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return '-'
  }

  const dateStr = timezone 
    ? formatDateWithTimezone(d, format, timezone)
    : formatDate(d, format)

  if (!includeTime) {
    return dateStr
  }

  // Add time component
  let timeStr: string
  if (timezone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    timeStr = formatter.format(d)
  } else {
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    timeStr = `${hours}:${minutes}:${seconds}`
  }

  return `${dateStr} ${timeStr}`
}

/**
 * Get current time in specified timezone
 * @param timezone - Timezone
 */
export function getCurrentTimeInTimezone(timezone: Timezone): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')

  return new Date(year, month, day, hour, minute, second)
}

/**
 * Get timezone display name
 * @param timezone - Timezone
 */
export function getTimezoneDisplayName(timezone: Timezone): string {
  const names: Record<Timezone, string> = {
    'Asia/Seoul': 'Seoul (KST, UTC+9)',
    'America/New_York': 'New York (EST, UTC-5)',
    'America/Los_Angeles': 'Los Angeles (PST, UTC-8)',
    'Europe/London': 'London (GMT, UTC+0)',
    'Europe/Paris': 'Paris (CET, UTC+1)',
    'Australia/Sydney': 'Sydney (AEST, UTC+10)',
    'Australia/Melbourne': 'Melbourne (AEST, UTC+10)',
    'Australia/Brisbane': 'Brisbane (AEST, UTC+10)',
    'Asia/Tokyo': 'Tokyo (JST, UTC+9)',
    'Asia/Shanghai': 'Shanghai (CST, UTC+8)',
    'UTC': 'UTC (UTC+0)',
  }
  return names[timezone] || timezone
}

/**
 * Get currency display name
 * @param currency - Currency code
 */
export function getCurrencyDisplayName(currency: Currency): string {
  const names: Record<Currency, string> = {
    USD: 'US Dollar ($)',
    KRW: 'Korean Won (₩)',
    EUR: 'Euro (€)',
    GBP: 'British Pound (£)',
    AUD: 'Australian Dollar (A$)',
    JPY: 'Japanese Yen (¥)',
    CNY: 'Chinese Yuan (¥)',
  }
  return names[currency] || currency
}

/**
 * Get date format preview
 * @param format - Date format
 */
export function getDateFormatPreview(format: DateFormat): string {
  const now = new Date()
  return formatDate(now, format)
}

