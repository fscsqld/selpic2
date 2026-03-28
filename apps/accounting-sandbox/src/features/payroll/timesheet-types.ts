/**
 * Timesheet Types - 타임시트 데이터 구조
 */

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'

export interface TimesheetEntry {
  id: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm (optional for hourly tracking)
  endTime?: string // HH:mm (optional for hourly tracking)
  hours: number // 총 근무 시간
  hourlyRate?: number // 시급 (optional, can be from employee profile)
  description?: string // 작업 내용 설명
  projectCode?: string // 프로젝트 코드 (optional)
  isOvertime?: boolean // 초과근무 여부
  overtimeMultiplier?: number // 초과근무 배수 (1.5, 2.0 등)
}

export interface Timesheet {
  id: string
  employeeId: string
  employeeName: string
  payPeriod: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
  }
  entries: TimesheetEntry[]
  status: TimesheetStatus
  totalHours: number
  totalRegularHours: number
  totalOvertimeHours: number
  grossPay: number // 계산된 총 급여
  submittedAt?: string // ISO string
  approvedAt?: string // ISO string
  approvedBy?: string // 관리자 username
  rejectedAt?: string // ISO string
  rejectedReason?: string
  paidAt?: string // ISO string
  notes?: string // 관리자 메모
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

export interface TimesheetSummary {
  employeeId: string
  employeeName: string
  payPeriod: {
    start: string
    end: string
  }
  totalHours: number
  totalRegularHours: number
  totalOvertimeHours: number
  grossPay: number
  status: TimesheetStatus
}
