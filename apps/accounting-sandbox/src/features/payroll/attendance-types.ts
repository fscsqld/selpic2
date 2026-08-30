/**
 * Staff attendance (clock in / out) — people-ops Phase 2.
 */

export type AttendanceSource = 'employee' | 'admin'

export interface AttendanceRecord {
  id: string
  /** Login / display employee id (same as timesheet.employeeId) */
  employeeId: string
  employeeName?: string
  /** ISO timestamp */
  clockInAt: string
  /** ISO timestamp; omit while shift is open */
  clockOutAt?: string
  note?: string
  source: AttendanceSource
  createdAt: string
  updatedAt: string
}

export interface AttendanceDayBucket {
  date: string // YYYY-MM-DD local
  totalHours: number
  ordinaryHours: number
  overtimeHours: number
  shifts: AttendanceRecord[]
}

export interface AttendancePeriodSummary {
  periodStart: string
  periodEnd: string
  totalHours: number
  ordinaryHours: number
  overtimeHours: number
  days: AttendanceDayBucket[]
  openShift: AttendanceRecord | null
}
