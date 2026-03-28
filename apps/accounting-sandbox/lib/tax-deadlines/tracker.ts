/**
 * Tax Deadline Tracker
 * 
 * Calculates BAS and PAYG withholding deadlines based on business profile settings
 */

export interface BusinessProfile {
  companyName: string
  abn: string
  acn?: string
  gstReportingCycle: 'Monthly' | 'Quarterly'
  paygReportingCycle: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  fbtRegistered?: boolean
}

export interface TaxDeadline {
  type: 'BAS' | 'PAYG' | 'INCOME_TAX' | 'FBT'
  period: string // e.g., "Q2 2024-2025" or "FY 2024-2025"
  dueDate: Date
  daysRemaining: number
  isUrgent: boolean // 7 days or less
}

/**
 * Calculate BAS deadline
 * BAS Deadline: 28th of the month following quarter end
 * 
 * For Quarterly: Q1 (Jul-Sep) → Oct 28, Q2 (Oct-Dec) → Jan 28, etc.
 * For Monthly: Month end → Next month 28th
 */
export function calculateBASDeadline(
  periodEndDate: Date,
  reportingCycle: 'Monthly' | 'Quarterly'
): Date {
  const endDate = new Date(periodEndDate)
  
  if (reportingCycle === 'Monthly') {
    // Monthly: Month end → Next month 28th
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(28)
    return nextMonth
  } else {
    // Quarterly: Quarter end → Next month 28th
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(28)
    return nextMonth
  }
}

/**
 * Calculate PAYG deadline
 * PAYG Deadline: 21st of the month following reporting period end (typically)
 * 
 * For Quarterly: Q1 (Jul-Sep) → Oct 21, Q2 (Oct-Dec) → Jan 21, etc.
 * For Monthly: Month end → Next month 21st
 */
export function calculatePAYGDeadline(
  periodEndDate: Date,
  reportingCycle: 'Monthly' | 'Quarterly'
): Date {
  const endDate = new Date(periodEndDate)
  
  if (reportingCycle === 'Monthly') {
    // Monthly: Month end → Next month 21st
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(21)
    return nextMonth
  } else {
    // Quarterly: Quarter end → Next month 21st
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(21)
    return nextMonth
  }
}

/**
 * Calculate Income Tax deadline
 * Income Tax Deadline: October 31st following the financial year end
 * 
 * Australian Financial Year: July 1 to June 30
 * Example: FY 2024-2025 (ends June 30, 2025) → Deadline: October 31, 2025
 */
export function calculateIncomeTaxDeadline(financialYearEnd: Date): Date {
  const deadline = new Date(financialYearEnd)
  deadline.setFullYear(deadline.getFullYear()) // Same year as FY end
  deadline.setMonth(9) // October (0-indexed: 9 = October)
  deadline.setDate(31)
  return deadline
}

/**
 * Calculate FBT deadline
 * FBT Year: April 1 to March 31
 * FBT Lodgement Deadline: May 21st following the FBT year end
 * 
 * Australian FBT Year: April 1 to March 31
 * Example: FBT Year 2024-2025 (April 1, 2024 to March 31, 2025) → Deadline: May 21, 2025
 * Example: FBT Year 2025-2026 (April 1, 2025 to March 31, 2026) → Deadline: May 21, 2026
 * 
 * @param currentDate - Current date (defaults to today)
 * @returns FBT lodgement deadline date (May 21st)
 */
export function calculateFBTDeadline(currentDate: Date = new Date()): Date {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() // 0-indexed (0 = January, 3 = April)
  
  // Determine current FBT year end (March 31)
  // FBT Year: April 1 to March 31
  let fbtYearEnd: Date
  if (currentMonth < 3) {
    // Before April (Jan-Mar), current FBT year ends on March 31 of current year
    // Example: If today is Feb 15, 2025 → FBT Year 2024-2025 ends March 31, 2025
    fbtYearEnd = new Date(currentYear, 2, 31) // March 31, current year
  } else {
    // April or later (Apr-Dec), current FBT year ends on March 31 of next year
    // Example: If today is May 15, 2025 → FBT Year 2025-2026 ends March 31, 2026
    fbtYearEnd = new Date(currentYear + 1, 2, 31) // March 31, next year
  }
  
  // Lodgement deadline is May 21st following the FBT year end
  const deadline = new Date(fbtYearEnd)
  deadline.setMonth(4) // May (0-indexed: 4 = May)
  deadline.setDate(21)
  
  return deadline
}

/**
 * Get the current financial year end date
 * Australian Financial Year: July 1 to June 30
 */
export function getCurrentFinancialYearEnd(currentDate: Date = new Date()): Date {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-12
  
  // If we're in Jul-Dec, FY ends next year June 30
  // If we're in Jan-Jun, FY ends this year June 30
  const financialYearEnd = month >= 7 ? year + 1 : year
  
  return new Date(financialYearEnd, 5, 30) // June 30 (month 5 = June, 0-indexed)
}

/**
 * Get Australian financial year quarters
 */
export function getFinancialYearQuarter(date: Date): {
  quarter: number
  year: string
  label: string
  startDate: Date
  endDate: Date
} {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  
  let quarter: number
  let startMonth: number
  let endMonth: number
  let financialYear: string
  
  if (month >= 7 && month <= 9) {
    // Q1: Jul-Sep
    quarter = 1
    startMonth = 7
    endMonth = 9
    financialYear = `${year}-${year + 1}`
  } else if (month >= 10 && month <= 12) {
    // Q2: Oct-Dec
    quarter = 2
    startMonth = 10
    endMonth = 12
    financialYear = `${year}-${year + 1}`
  } else if (month >= 1 && month <= 3) {
    // Q3: Jan-Mar
    quarter = 3
    startMonth = 1
    endMonth = 3
    financialYear = `${year - 1}-${year}`
  } else {
    // Q4: Apr-Jun
    quarter = 4
    startMonth = 4
    endMonth = 6
    financialYear = `${year - 1}-${year}`
  }
  
  const startDate = new Date(year, startMonth - 1, 1)
  const endDate = new Date(year, endMonth, 0) // Last day of the month
  
  return {
    quarter,
    year: financialYear,
    label: `Q${quarter} ${financialYear}`,
    startDate,
    endDate,
  }
}

/**
 * Get all upcoming tax deadlines
 */
export function getUpcomingDeadlines(
  profile: BusinessProfile | null,
  currentDate: Date = new Date()
): TaxDeadline[] {
  if (!profile) {
    return []
  }

  const deadlines: TaxDeadline[] = []

  // Get current quarter
  const currentQuarter = getFinancialYearQuarter(currentDate)

  // Calculate BAS deadlines for next 4 periods
  if (profile.gstReportingCycle === 'Quarterly') {
    for (let i = 0; i < 4; i++) {
      const quarterDate = new Date(currentQuarter.endDate)
      quarterDate.setMonth(quarterDate.getMonth() + i * 3)
      
      const quarter = getFinancialYearQuarter(quarterDate)
      const dueDate = calculateBASDeadline(quarter.endDate, 'Quarterly')
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -30) { // Include past 30 days and future
        deadlines.push({
          type: 'BAS',
          period: quarter.label,
          dueDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        })
      }
    }
  } else {
    // Monthly BAS
    for (let i = 0; i < 4; i++) {
      const monthDate = new Date(currentDate)
      monthDate.setMonth(monthDate.getMonth() + i)
      monthDate.setDate(0) // Last day of the month
      
      const dueDate = calculateBASDeadline(monthDate, 'Monthly')
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -30) {
        const monthLabel = monthDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
        deadlines.push({
          type: 'BAS',
          period: monthLabel,
          dueDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        })
      }
    }
  }

  // Calculate PAYG deadlines
  if (profile.paygReportingCycle === 'Quarterly') {
    for (let i = 0; i < 4; i++) {
      const quarterDate = new Date(currentQuarter.endDate)
      quarterDate.setMonth(quarterDate.getMonth() + i * 3)
      
      const quarter = getFinancialYearQuarter(quarterDate)
      const dueDate = calculatePAYGDeadline(quarter.endDate, 'Quarterly')
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -30) {
        deadlines.push({
          type: 'PAYG',
          period: quarter.label,
          dueDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        })
      }
    }
  } else {
    // Monthly PAYG
    for (let i = 0; i < 4; i++) {
      const monthDate = new Date(currentDate)
      monthDate.setMonth(monthDate.getMonth() + i)
      monthDate.setDate(0) // Last day of the month
      
      const dueDate = calculatePAYGDeadline(monthDate, 'Monthly')
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -30) {
        const monthLabel = monthDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
        deadlines.push({
          type: 'PAYG',
          period: monthLabel,
          dueDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        })
      }
    }
  }

  // Calculate Income Tax deadlines
  // Income Tax is due October 31st following each financial year end
  const currentFYEnd = getCurrentFinancialYearEnd(currentDate)
  
  // Calculate for current and next financial year
  for (let i = 0; i < 2; i++) {
    const fyEnd = new Date(currentFYEnd)
    fyEnd.setFullYear(fyEnd.getFullYear() + i)
    
    const dueDate = calculateIncomeTaxDeadline(fyEnd)
    const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Include if within 1 year before or after
    if (daysRemaining >= -365 && daysRemaining <= 365) {
      const financialYear = `${fyEnd.getFullYear() - 1}-${fyEnd.getFullYear()}`
      deadlines.push({
        type: 'INCOME_TAX',
        period: `FY ${financialYear}`,
        dueDate,
        daysRemaining,
        isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
      })
    }
  }

  // Calculate FBT deadlines (only if FBT registered)
  if (profile.fbtRegistered) {
    // FBT Year: April 1 to March 31
    // FBT Lodgement Deadline: May 21st following the FBT year end
    // Calculate for current and next FBT year
    for (let i = 0; i < 2; i++) {
      // Calculate FBT year end dates
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() // 0-indexed
      
      let fbtYearEnd: Date
      if (currentMonth < 3) {
        // Before April, current FBT year ends March 31 of current year
        fbtYearEnd = new Date(currentYear + i, 2, 31) // March 31
      } else {
        // April or later, current FBT year ends March 31 of next year
        fbtYearEnd = new Date(currentYear + i + 1, 2, 31) // March 31
      }
      
      // Calculate deadline (May 21st following FBT year end)
      const dueDate = new Date(fbtYearEnd)
      dueDate.setMonth(4) // May (0-indexed: 4 = May)
      dueDate.setDate(21)
      
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Include if within 1 year before or after
      if (daysRemaining >= -365 && daysRemaining <= 365) {
        // FBT Year label: April 1, YYYY to March 31, YYYY+1
        const fbtYearStart = fbtYearEnd.getFullYear() - 1
        const fbtYearEndYear = fbtYearEnd.getFullYear()
        const fbtYearLabel = `FBT Year ${fbtYearStart}-${fbtYearEndYear} (Apr 1, ${fbtYearStart} - Mar 31, ${fbtYearEndYear})`
        
        deadlines.push({
          type: 'FBT',
          period: fbtYearLabel,
          dueDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        })
      }
    }
  }

  // Sort by due date
  return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}
