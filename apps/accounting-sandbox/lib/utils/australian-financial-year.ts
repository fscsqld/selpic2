/**
 * Australian Financial Year Utilities
 * 
 * 호주 회계연도 기준 (7월 1일 ~ 6월 30일)
 * Q1: Jul-Sep (7-9월)
 * Q2: Oct-Dec (10-12월)
 * Q3: Jan-Mar (1-3월)
 * Q4: Apr-Jun (4-6월)
 */

export interface AustralianQuarter {
  quarter: 1 | 2 | 3 | 4
  financialYear: string // e.g., "2024-2025"
  startDate: Date
  endDate: Date
  startDateStr: string // YYYY-MM-DD
  endDateStr: string // YYYY-MM-DD
}

/**
 * Get Australian Financial Year from a date
 * Financial Year runs from July 1 to June 30
 * e.g., July 1, 2024 to June 30, 2025 = FY 2024-2025
 */
export function getAustralianFinancialYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  
  if (month >= 7) {
    // July-December: Current year to next year
    return `${year}-${year + 1}`
  } else {
    // January-June: Previous year to current year
    return `${year - 1}-${year}`
  }
}

/**
 * Get Australian Quarter from a date
 * Returns quarter number (1-4) and financial year
 */
export function getAustralianQuarter(date: Date): { quarter: 1 | 2 | 3 | 4; financialYear: string } {
  const month = date.getMonth() + 1 // 1-12
  const financialYear = getAustralianFinancialYear(date)
  
  let quarter: 1 | 2 | 3 | 4
  if (month >= 7 && month <= 9) {
    quarter = 1 // Q1: Jul-Sep
  } else if (month >= 10 && month <= 12) {
    quarter = 2 // Q2: Oct-Dec
  } else if (month >= 1 && month <= 3) {
    quarter = 3 // Q3: Jan-Mar
  } else {
    quarter = 4 // Q4: Apr-Jun
  }
  
  return { quarter, financialYear }
}

/**
 * Get quarter date range for Australian Financial Year
 */
export function getAustralianQuarterDates(
  quarter: 1 | 2 | 3 | 4,
  financialYear: string
): AustralianQuarter {
  const [startYear, endYear] = financialYear.split('-').map(Number)
  
  let startDate: Date
  let endDate: Date
  
  if (quarter === 1) {
    // Q1: Jul-Sep
    startDate = new Date(startYear, 6, 1) // July 1
    endDate = new Date(startYear, 9, 0) // September 30 (last day of September)
  } else if (quarter === 2) {
    // Q2: Oct-Dec
    startDate = new Date(startYear, 9, 1) // October 1
    endDate = new Date(startYear, 12, 0) // December 31 (last day of December)
  } else if (quarter === 3) {
    // Q3: Jan-Mar
    startDate = new Date(endYear, 0, 1) // January 1
    endDate = new Date(endYear, 3, 0) // March 31 (last day of March - using month 3, day 0)
  } else {
    // Q4: Apr-Jun
    startDate = new Date(endYear, 3, 1) // April 1
    endDate = new Date(endYear, 6, 0) // June 30 (last day of June)
  }
  
  // Format dates as YYYY-MM-DD using local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return {
    quarter,
    financialYear,
    startDate,
    endDate,
    startDateStr: formatLocalDate(startDate),
    endDateStr: formatLocalDate(endDate),
  }
}

/**
 * Get current Australian quarter
 */
export function getCurrentAustralianQuarter(): AustralianQuarter {
  const now = new Date()
  const { quarter, financialYear } = getAustralianQuarter(now)
  return getAustralianQuarterDates(quarter, financialYear)
}

/**
 * Get current month's date range (Australian format)
 */
export function getCurrentMonthDates(): { startDate: Date; endDate: Date; startDateStr: string; endDateStr: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0) // Last day of month
  
  // Format dates as YYYY-MM-DD using local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  
  return {
    startDate,
    endDate,
    startDateStr: formatLocalDate(startDate),
    endDateStr: formatLocalDate(endDate),
  }
}

/**
 * Get all quarters for a financial year
 */
export function getAllQuartersForFinancialYear(financialYear: string): AustralianQuarter[] {
  return [
    getAustralianQuarterDates(1, financialYear),
    getAustralianQuarterDates(2, financialYear),
    getAustralianQuarterDates(3, financialYear),
    getAustralianQuarterDates(4, financialYear),
  ]
}
