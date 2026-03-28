/**
 * Timesheet Calculator - 타임시트 계산 로직
 * 
 * 근무 시간, 초과근무, 총 급여 계산
 */

import { Timesheet, TimesheetEntry } from './timesheet-types'

/**
 * 타임시트 총 근무 시간 계산
 */
export function calculateTotalHours(entries: TimesheetEntry[]): {
  totalHours: number
  totalRegularHours: number
  totalOvertimeHours: number
} {
  let totalRegularHours = 0
  let totalOvertimeHours = 0

  entries.forEach(entry => {
    if (entry.isOvertime) {
      totalOvertimeHours += entry.hours
    } else {
      totalRegularHours += entry.hours
    }
  })

  return {
    totalHours: totalRegularHours + totalOvertimeHours,
    totalRegularHours,
    totalOvertimeHours,
  }
}

/**
 * 타임시트 총 급여 계산
 */
export function calculateGrossPay(
  entries: TimesheetEntry[],
  defaultHourlyRate?: number
): number {
  let totalPay = 0

  entries.forEach(entry => {
    const hourlyRate = entry.hourlyRate || defaultHourlyRate || 0
    let pay = entry.hours * hourlyRate

    // 초과근무 할증 적용
    if (entry.isOvertime && entry.overtimeMultiplier) {
      pay = pay * entry.overtimeMultiplier
    }

    totalPay += pay
  })

  return Math.round(totalPay * 100) / 100 // 소수점 2자리 반올림
}

/**
 * 타임시트 검증
 */
export function validateTimesheet(timesheet: Partial<Timesheet>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!timesheet.employeeId) {
    errors.push('Employee ID is required')
  }

  if (!timesheet.employeeName) {
    errors.push('Employee name is required')
  }

  if (!timesheet.payPeriod?.start || !timesheet.payPeriod?.end) {
    errors.push('Pay period is required')
  }

  if (!timesheet.entries || timesheet.entries.length === 0) {
    errors.push('At least one timesheet entry is required')
  }

  if (timesheet.entries) {
    timesheet.entries.forEach((entry, index) => {
      if (!entry.date) {
        errors.push(`Entry ${index + 1}: Date is required`)
      }
      if (!entry.hours || entry.hours <= 0) {
        errors.push(`Entry ${index + 1}: Hours must be greater than 0`)
      }
      if (entry.startTime && entry.endTime) {
        // 시간 검증 로직 추가 가능
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 시간 문자열을 분으로 변환 (HH:mm -> minutes)
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 분을 시간 문자열로 변환 (minutes -> HH:mm)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * 시작 시간과 종료 시간으로 근무 시간 계산
 */
export function calculateHoursFromTimes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  
  if (end < start) {
    // 자정을 넘어가는 경우 (예: 22:00 - 06:00)
    return (24 * 60 - start + end) / 60
  }
  
  return (end - start) / 60
}
