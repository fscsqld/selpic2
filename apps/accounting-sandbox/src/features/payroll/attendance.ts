/**
 * Attendance hours + timesheet draft builders (Phase 2).
 *
 * Invariant: completed shifts (clock-in + clock-out) drive pay hours.
 * Open shifts are visible but excluded from pay totals until closed.
 */

import type {
  AttendanceDayBucket,
  AttendancePeriodSummary,
  AttendanceRecord,
} from './attendance-types'
import type { Timesheet, TimesheetEntry } from './timesheet-types'
import { calculateGrossPay, calculateTotalHours } from './timesheet-calculator'

/** Ordinary hours before daily overtime (simple AU-style default). */
export const DEFAULT_ORDINARY_HOURS_PER_DAY = 8
export const DEFAULT_OVERTIME_MULTIPLIER = 1.5

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar date YYYY-MM-DD from an ISO / Date. */
export function toLocalDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function toLocalTimeHm(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Monday 00:00 local for the week containing `ref`. */
export function startOfWeekMonday(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const day = d.getDay() // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeekSunday(ref: Date = new Date()): Date {
  const start = startOfWeekMonday(ref)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function startOfMonth(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Elapsed hours between clock-in and clock-out (supports overnight).
 * Returns 0 for invalid / missing out / negative absurd spans (> 24h capped warn).
 */
export function attendanceDurationHours(
  clockInAt: string,
  clockOutAt?: string | null
): number {
  if (!clockOutAt) return 0
  const start = new Date(clockInAt).getTime()
  const end = new Date(clockOutAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const hours = (end - start) / (1000 * 60 * 60)
  // Guard open-source bad clocks (forgot to clock out for days)
  if (hours > 24) return Math.round(24 * 100) / 100
  return Math.round(hours * 100) / 100
}

export function isOpenShift(record: AttendanceRecord): boolean {
  return !record.clockOutAt
}

export function findOpenShift(
  records: AttendanceRecord[]
): AttendanceRecord | null {
  return records.find(isOpenShift) || null
}

export function filterRecordsInRange(
  records: AttendanceRecord[],
  periodStart: string,
  periodEnd: string
): AttendanceRecord[] {
  const startMs = new Date(`${periodStart}T00:00:00`).getTime()
  const endMs = new Date(`${periodEnd}T23:59:59.999`).getTime()
  return records.filter((r) => {
    const t = new Date(r.clockInAt).getTime()
    return Number.isFinite(t) && t >= startMs && t <= endMs
  })
}

function splitOrdinaryOvertime(
  totalHours: number,
  ordinaryCap: number
): { ordinaryHours: number; overtimeHours: number } {
  const ordinaryHours = Math.min(totalHours, ordinaryCap)
  const overtimeHours = Math.max(0, totalHours - ordinaryCap)
  return {
    ordinaryHours: Math.round(ordinaryHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  }
}

/**
 * Group completed shifts by local clock-in date; apply daily ordinary/OT split.
 */
export function aggregateAttendanceByDay(
  records: AttendanceRecord[],
  ordinaryHoursPerDay: number = DEFAULT_ORDINARY_HOURS_PER_DAY
): AttendanceDayBucket[] {
  const completed = records.filter((r) => !isOpenShift(r))
  const byDate = new Map<string, AttendanceRecord[]>()

  for (const r of completed) {
    const key = toLocalDateKey(r.clockInAt)
    if (!key) continue
    const list = byDate.get(key) || []
    list.push(r)
    byDate.set(key, list)
  }

  const days: AttendanceDayBucket[] = []
  for (const [date, shifts] of [...byDate.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const totalHours = Math.round(
      shifts.reduce(
        (sum, s) => sum + attendanceDurationHours(s.clockInAt, s.clockOutAt),
        0
      ) * 100
    ) / 100
    const { ordinaryHours, overtimeHours } = splitOrdinaryOvertime(
      totalHours,
      ordinaryHoursPerDay
    )
    days.push({ date, totalHours, ordinaryHours, overtimeHours, shifts })
  }
  return days
}

export function summarizeAttendancePeriod(
  records: AttendanceRecord[],
  periodStart: string,
  periodEnd: string,
  ordinaryHoursPerDay: number = DEFAULT_ORDINARY_HOURS_PER_DAY
): AttendancePeriodSummary {
  const inRange = filterRecordsInRange(records, periodStart, periodEnd)
  const openShift = findOpenShift(inRange)
  const days = aggregateAttendanceByDay(inRange, ordinaryHoursPerDay)
  const totalHours = Math.round(
    days.reduce((s, d) => s + d.totalHours, 0) * 100
  ) / 100
  const ordinaryHours = Math.round(
    days.reduce((s, d) => s + d.ordinaryHours, 0) * 100
  ) / 100
  const overtimeHours = Math.round(
    days.reduce((s, d) => s + d.overtimeHours, 0) * 100
  ) / 100

  return {
    periodStart,
    periodEnd,
    totalHours,
    ordinaryHours,
    overtimeHours,
    days,
    openShift,
  }
}

export function buildTimesheetEntriesFromAttendance(
  records: AttendanceRecord[],
  options: {
    hourlyRate: number
    ordinaryHoursPerDay?: number
    overtimeMultiplier?: number
    periodStart: string
    periodEnd: string
  }
): TimesheetEntry[] {
  const ordinaryCap = options.ordinaryHoursPerDay ?? DEFAULT_ORDINARY_HOURS_PER_DAY
  const otMult = options.overtimeMultiplier ?? DEFAULT_OVERTIME_MULTIPLIER
  const days = aggregateAttendanceByDay(
    filterRecordsInRange(records, options.periodStart, options.periodEnd),
    ordinaryCap
  )

  const entries: TimesheetEntry[] = []
  for (const day of days) {
    if (day.ordinaryHours > 0) {
      entries.push({
        id: `att_${day.date}_reg`,
        date: day.date,
        hours: day.ordinaryHours,
        hourlyRate: options.hourlyRate,
        description: 'From attendance (ordinary)',
        isOvertime: false,
      })
    }
    if (day.overtimeHours > 0) {
      entries.push({
        id: `att_${day.date}_ot`,
        date: day.date,
        hours: day.overtimeHours,
        hourlyRate: options.hourlyRate,
        description: 'From attendance (overtime)',
        isOvertime: true,
        overtimeMultiplier: otMult,
      })
    }
  }
  return entries
}

export function buildTimesheetDraftFromAttendance(params: {
  employeeId: string
  employeeName: string
  hourlyRate: number
  records: AttendanceRecord[]
  periodStart: string
  periodEnd: string
  ordinaryHoursPerDay?: number
  overtimeMultiplier?: number
}): Timesheet {
  const entries = buildTimesheetEntriesFromAttendance(params.records, {
    hourlyRate: params.hourlyRate,
    ordinaryHoursPerDay: params.ordinaryHoursPerDay,
    overtimeMultiplier: params.overtimeMultiplier,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })
  const totals = calculateTotalHours(entries)
  const grossPay = calculateGrossPay(entries, params.hourlyRate)
  const now = new Date().toISOString()

  return {
    id: `timesheet_att_${params.employeeId}_${params.periodStart}_${Date.now()}`,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    payPeriod: { start: params.periodStart, end: params.periodEnd },
    entries,
    status: 'draft',
    totalHours: totals.totalHours,
    totalRegularHours: totals.totalRegularHours,
    totalOvertimeHours: totals.totalOvertimeHours,
    grossPay,
    notes: 'Draft generated from attendance clock records',
    createdAt: now,
    updatedAt: now,
  }
}
