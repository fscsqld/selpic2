/**
 * Tax Deadlines - 세무 마감일 계산
 * 
 * BAS, PAYG, FBT, Income Tax 마감일 계산 로직
 */

import { TaxDeadline } from './types'

export interface BusinessProfile {
  companyName: string
  abn: string
  acn?: string
  gstReportingCycle: 'Monthly' | 'Quarterly'
  paygReportingCycle: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  fbtRegistered?: boolean
}

/**
 * BAS 마감일 계산
 * BAS Deadline: 28th of the month following quarter end
 */
export function calculateBASDeadline(
  periodEndDate: Date,
  reportingCycle: 'Monthly' | 'Quarterly'
): Date {
  const endDate = new Date(periodEndDate)
  
  if (reportingCycle === 'Monthly') {
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(28)
    return nextMonth
  } else {
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(28)
    return nextMonth
  }
}

/**
 * PAYG 마감일 계산
 * PAYG Deadline: 21st of the month following reporting period end
 */
export function calculatePAYGDeadline(
  periodEndDate: Date,
  reportingCycle: 'Monthly' | 'Quarterly'
): Date {
  const endDate = new Date(periodEndDate)
  
  if (reportingCycle === 'Monthly') {
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(21)
    return nextMonth
  } else {
    const nextMonth = new Date(endDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(21)
    return nextMonth
  }
}

/**
 * Income Tax 마감일 계산
 * Income Tax Deadline: October 31st following the financial year end
 */
export function calculateIncomeTaxDeadline(financialYearEnd: Date): Date {
  const deadline = new Date(financialYearEnd)
  deadline.setFullYear(deadline.getFullYear())
  deadline.setMonth(9) // October (0-indexed: 9 = October)
  deadline.setDate(31)
  return deadline
}

/**
 * FBT 마감일 계산
 * FBT Year: April 1 to March 31
 * FBT Lodgement Deadline: May 21st following the FBT year end
 */
export function calculateFBTDeadline(currentDate: Date = new Date()): Date {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  
  let fbtYearEnd: Date
  if (currentMonth < 3) { // Jan, Feb, Mar
    fbtYearEnd = new Date(currentYear, 2, 31) // March 31
  } else { // Apr-Dec
    fbtYearEnd = new Date(currentYear + 1, 2, 31) // March 31
  }
  
  const deadline = new Date(fbtYearEnd)
  deadline.setMonth(4) // May
  deadline.setDate(21)
  
  return deadline
}

/**
 * 다가오는 마감일 목록 가져오기
 * @param profile - 비즈니스 프로필
 * @param currentDate - 현재 날짜
 * @returns 마감일 목록
 */
export function getUpcomingDeadlines(
  profile: BusinessProfile | null,
  currentDate: Date = new Date()
): TaxDeadline[] {
  const deadlines: TaxDeadline[] = []
  
  if (!profile) return deadlines
  
  // BAS Deadlines
  if (profile.gstRegistered) {
    const now = currentDate
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const quarterEnds = [
      new Date(now.getFullYear(), 2, 31), // Q3: Mar 31
      new Date(now.getFullYear(), 5, 30), // Q4: Jun 30
      new Date(now.getFullYear(), 8, 30), // Q1: Sep 30
      new Date(now.getFullYear(), 11, 31), // Q2: Dec 31
    ]
    
    for (let i = 0; i < 2; i++) {
      const quarterIndex = (currentQuarter + i) % 4
      const quarterEnd = quarterEnds[quarterIndex]
      const dueDate = calculateBASDeadline(quarterEnd, profile.gstReportingCycle)
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -30 && daysRemaining <= 365) {
        deadlines.push({
          type: 'BAS',
          period: `Q${quarterIndex + 1} ${now.getFullYear()}-${now.getFullYear() + 1}`,
          dueDate: dueDate.toISOString(),
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
          isOverdue: daysRemaining < 0,
        })
      }
    }
  }
  
  // PAYG Deadlines
  for (let i = 0; i < 2; i++) {
    const now = currentDate
    const quarterEnds = [
      new Date(now.getFullYear(), 2, 31),
      new Date(now.getFullYear(), 5, 30),
      new Date(now.getFullYear(), 8, 30),
      new Date(now.getFullYear(), 11, 31),
    ]
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const quarterIndex = (currentQuarter + i) % 4
    const quarterEnd = quarterEnds[quarterIndex]
    const dueDate = calculatePAYGDeadline(quarterEnd, profile.paygReportingCycle)
    const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysRemaining >= -30 && daysRemaining <= 365) {
      deadlines.push({
        type: 'PAYG',
        period: `Q${quarterIndex + 1} ${now.getFullYear()}-${now.getFullYear() + 1}`,
        dueDate: dueDate.toISOString(),
        daysRemaining,
        isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        isOverdue: daysRemaining < 0,
      })
    }
  }
  
  // FBT Deadlines
  if (profile.fbtRegistered) {
    for (let i = 0; i < 2; i++) {
      const yearOffset = (currentDate.getMonth() < 3) ? i : i + 1
      const fbtYearStart = new Date(currentDate.getFullYear() + yearOffset - 1, 3, 1) // April 1
      const fbtYearEnd = new Date(currentDate.getFullYear() + yearOffset, 2, 31) // March 31
      const dueDate = calculateFBTDeadline(fbtYearEnd)
      const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining >= -365 && daysRemaining <= 365) {
        const fbtYearLabel = `FBT Year ${fbtYearStart.getFullYear()}-${fbtYearEnd.getFullYear()} (Apr 1, ${fbtYearStart.getFullYear()} - Mar 31, ${fbtYearEnd.getFullYear()})`
        deadlines.push({
          type: 'FBT',
          period: fbtYearLabel,
          dueDate: dueDate.toISOString(),
          daysRemaining,
          isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
          isOverdue: daysRemaining < 0,
        })
      }
    }
  }
  
  // Income Tax Deadlines
  const financialYearEnd = getCurrentFinancialYearEnd(currentDate)
  const incomeTaxDeadline = calculateIncomeTaxDeadline(financialYearEnd)
  const daysRemaining = Math.ceil((incomeTaxDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysRemaining >= -365 && daysRemaining <= 365) {
    deadlines.push({
      type: 'Income Tax',
      period: `FY ${financialYearEnd.getFullYear() - 1}-${financialYearEnd.getFullYear()}`,
      dueDate: incomeTaxDeadline.toISOString(),
      daysRemaining,
      isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
      isOverdue: daysRemaining < 0,
    })
  }
  
  // Sort by days remaining
  return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining)
}

/**
 * 현재 재정 연도 종료일 가져오기
 */
function getCurrentFinancialYearEnd(currentDate: Date = new Date()): Date {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  
  const financialYearEnd = month >= 7 ? year + 1 : year
  return new Date(financialYearEnd, 5, 30) // June 30
}
