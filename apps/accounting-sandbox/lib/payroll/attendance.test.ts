import { describe, expect, it } from 'vitest'
import {
  attendanceDurationHours,
  aggregateAttendanceByDay,
  buildTimesheetDraftFromAttendance,
  filterRecordsInRange,
  findOpenShift,
  startOfWeekMonday,
  summarizeAttendancePeriod,
  toLocalDateKey,
} from '@/src/features/payroll/attendance'
import type { AttendanceRecord } from '@/src/features/payroll/attendance-types'

function shift(
  partial: Partial<AttendanceRecord> & Pick<AttendanceRecord, 'id' | 'clockInAt'>
): AttendanceRecord {
  return {
    employeeId: 'E001',
    source: 'employee',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...partial,
  }
}

describe('attendance Phase 2', () => {
  it('computes duration including overnight and caps absurd spans', () => {
    expect(
      attendanceDurationHours(
        '2026-05-12T22:00:00.000Z',
        '2026-05-13T06:00:00.000Z'
      )
    ).toBe(8)
    expect(attendanceDurationHours('2026-05-12T09:00:00.000Z')).toBe(0)
    expect(
      attendanceDurationHours(
        '2026-05-01T00:00:00.000Z',
        '2026-05-05T00:00:00.000Z'
      )
    ).toBe(24)
  })

  it('excludes open shifts from day totals and finds open shift', () => {
    const records = [
      shift({
        id: '1',
        clockInAt: '2026-05-12T09:00:00',
        clockOutAt: '2026-05-12T17:00:00',
      }),
      shift({
        id: '2',
        clockInAt: '2026-05-13T09:00:00',
      }),
    ]
    expect(findOpenShift(records)?.id).toBe('2')
    const days = aggregateAttendanceByDay(records)
    expect(days).toHaveLength(1)
    expect(days[0].totalHours).toBe(8)
    expect(days[0].ordinaryHours).toBe(8)
    expect(days[0].overtimeHours).toBe(0)
  })

  it('splits overtime over 8h/day and builds timesheet + gross', () => {
    const records = [
      shift({
        id: '1',
        clockInAt: '2026-05-12T08:00:00',
        clockOutAt: '2026-05-12T18:00:00', // 10h
      }),
    ]
    const summary = summarizeAttendancePeriod(records, '2026-05-12', '2026-05-12')
    expect(summary.ordinaryHours).toBe(8)
    expect(summary.overtimeHours).toBe(2)

    const draft = buildTimesheetDraftFromAttendance({
      employeeId: 'E001',
      employeeName: 'Alex',
      hourlyRate: 50,
      records,
      periodStart: '2026-05-12',
      periodEnd: '2026-05-12',
    })
    expect(draft.status).toBe('draft')
    expect(draft.entries).toHaveLength(2)
    // 8*50 + 2*50*1.5 = 400 + 150 = 550
    expect(draft.grossPay).toBe(550)
  })

  it('filters by period and week Monday helper returns Monday', () => {
    const wed = new Date(2026, 4, 13) // May 13 2026 Wednesday
    const mon = startOfWeekMonday(wed)
    expect(toLocalDateKey(mon)).toBe('2026-05-11')

    const records = [
      shift({
        id: '1',
        clockInAt: '2026-05-10T09:00:00',
        clockOutAt: '2026-05-10T17:00:00',
      }),
      shift({
        id: '2',
        clockInAt: '2026-05-12T09:00:00',
        clockOutAt: '2026-05-12T17:00:00',
      }),
    ]
    expect(filterRecordsInRange(records, '2026-05-11', '2026-05-17')).toHaveLength(1)
  })
})
