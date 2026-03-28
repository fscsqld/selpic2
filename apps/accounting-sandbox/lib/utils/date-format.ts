/**
 * Date Formatting Utilities
 * 
 * 호주 표준 날짜 형식 (DD/MM/YYYY) 지원
 */

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY (Australian format)
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted string in DD/MM/YYYY format
 */
export function formatDateAustralian(dateStr: string): string {
  if (!dateStr) return ''
  
  try {
    // Handle ISO date strings (e.g., "2026-01-17T02:30:35.840Z")
    if (dateStr.includes('T')) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
    }
    
    // Handle YYYY-MM-DD format
    if (dateStr.includes('-') && !dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('-')
      if (year && month && day) {
        return `${day}/${month}/${year}`
      }
    }
    
    // If already in DD/MM/YYYY format, return as-is
    if (dateStr.includes('/') && dateStr.split('/').length === 3) {
      return dateStr
    }
    
    // Try to parse as Date object
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    
    return dateStr
  } catch (error) {
    console.error('[Date Format] Error formatting date:', dateStr, error)
    return dateStr
  }
}

/**
 * Format date from Date object to DD/MM/YYYY (Australian format)
 * @param date - Date object
 * @returns Formatted string in DD/MM/YYYY format
 */
export function formatDateObjectAustralian(date: Date): string {
  if (!date || isNaN(date.getTime())) return ''
  
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

