/**
 * Employee clock in / out + week/month hours → timesheet draft (Phase 2).
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, LogIn, LogOut, CalendarRange, FilePlus2, Loader2 } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { AttendanceRecord } from '@/src/features/payroll/attendance-types'
import {
  buildTimesheetDraftFromAttendance,
  endOfMonth,
  endOfWeekSunday,
  findOpenShift,
  startOfMonth,
  startOfWeekMonday,
  summarizeAttendancePeriod,
  toLocalDateKey,
  toLocalTimeHm,
} from '@/src/features/payroll/attendance'
import { calculatePayroll } from '@/src/features/payroll/calculator'
import type { Employee } from '@/src/shared/types/employee'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface EmployeeAttendancePanelProps {
  employee: Employee
  onTimesheetDraftCreated?: () => void
}

type PeriodMode = 'week' | 'month'

function periodBounds(mode: PeriodMode, ref: Date = new Date()) {
  if (mode === 'week') {
    return {
      start: toLocalDateKey(startOfWeekMonday(ref)),
      end: toLocalDateKey(endOfWeekSunday(ref)),
    }
  }
  return {
    start: toLocalDateKey(startOfMonth(ref)),
    end: toLocalDateKey(endOfMonth(ref)),
  }
}

export function EmployeeAttendancePanel({
  employee,
  onTimesheetDraftCreated,
}: EmployeeAttendancePanelProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week')
  const [message, setMessage] = useState<string | null>(null)

  const bounds = useMemo(() => periodBounds(periodMode), [periodMode])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const rows = (await indexedDBStorage.getAttendanceRecords(
        employee.employeeId
      )) as AttendanceRecord[]
      setRecords(rows)
    } catch (err) {
      console.error('[EmployeeAttendancePanel]', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [employee.employeeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openShift = useMemo(() => findOpenShift(records), [records])
  const summary = useMemo(
    () => summarizeAttendancePeriod(records, bounds.start, bounds.end),
    [records, bounds.start, bounds.end]
  )

  const payPreview = useMemo(() => {
    const rate = employee.hourlyRate || 0
    if (rate <= 0 || summary.totalHours <= 0) return null
    const draft = buildTimesheetDraftFromAttendance({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      hourlyRate: rate,
      records,
      periodStart: bounds.start,
      periodEnd: bounds.end,
    })
    return {
      grossPay: draft.grossPay,
      payroll: calculatePayroll(employee, draft.grossPay),
      draft,
    }
  }, [employee, records, bounds, summary.totalHours])

  const handleClockIn = async () => {
    if (openShift) {
      setMessage('You already have an open shift. Clock out first.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await indexedDBStorage.saveAttendanceRecord({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        clockInAt: new Date().toISOString(),
        source: 'employee',
      })
      setMessage('Clocked in.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Clock-in failed')
    } finally {
      setBusy(false)
    }
  }

  const handleClockOut = async () => {
    if (!openShift) {
      setMessage('No open shift to clock out.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await indexedDBStorage.saveAttendanceRecord({
        ...openShift,
        clockOutAt: new Date().toISOString(),
      })
      setMessage('Clocked out.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Clock-out failed')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelOpen = async () => {
    if (!openShift) return
    if (!window.confirm('Cancel the open shift (no hours will be recorded)?')) return
    setBusy(true)
    try {
      await indexedDBStorage.deleteAttendanceRecord(openShift.id)
      setMessage('Open shift cancelled.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateTimesheetDraft = async () => {
    if (!employee.hourlyRate || employee.hourlyRate <= 0) {
      setMessage('Set an hourly rate on your employee profile before creating a timesheet.')
      return
    }
    if (summary.totalHours <= 0) {
      setMessage('No completed attendance hours in this period.')
      return
    }
    if (openShift) {
      setMessage('Clock out (or cancel) the open shift before creating a timesheet.')
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      const draft = buildTimesheetDraftFromAttendance({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        hourlyRate: employee.hourlyRate,
        records,
        periodStart: bounds.start,
        periodEnd: bounds.end,
      })
      await indexedDBStorage.saveTimesheet(draft)
      setMessage(
        `Timesheet draft created for ${bounds.start} → ${bounds.end} (${draft.totalHours}h, gross ${formatCurrency(draft.grossPay)}). Submit it below or from Enter Work Hours.`
      )
      onTimesheetDraftCreated?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('timesheetStatusUpdated', {
            detail: { timesheetId: draft.id, status: 'draft' },
          })
        )
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to create timesheet')
    } finally {
      setBusy(false)
    }
  }

  const recent = records.slice(0, 12)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Attendance
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Clock in and out yourself. Week / month hours feed a timesheet draft for approval
            (admin confirms pay). Open shifts are not counted until you clock out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleClockIn()}
            disabled={busy || !!openShift}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Clock In
          </button>
          <button
            type="button"
            onClick={() => void handleClockOut()}
            disabled={busy || !openShift}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Clock Out
          </button>
          {openShift && (
            <button
              type="button"
              onClick={() => void handleCancelOpen()}
              disabled={busy}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel open
            </button>
          )}
        </div>
      </div>

      {openShift && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
          On shift since {formatDateAustralian(toLocalDateKey(openShift.clockInAt))}{' '}
          {toLocalTimeHm(openShift.clockInAt)}
        </div>
      )}

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="w-4 h-4 text-gray-500" />
        <button
          type="button"
          onClick={() => setPeriodMode('week')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            periodMode === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode('month')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            periodMode === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This month
        </button>
        <span className="text-xs text-gray-500">
          {formatDateAustralian(bounds.start)} – {formatDateAustralian(bounds.end)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Total hours</p>
          <p className="text-lg font-bold text-gray-900">
            {loading ? '…' : summary.totalHours.toFixed(2)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Ordinary</p>
          <p className="text-lg font-bold text-gray-900">
            {loading ? '…' : summary.ordinaryHours.toFixed(2)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Overtime (&gt;8h/day)</p>
          <p className="text-lg font-bold text-gray-900">
            {loading ? '…' : summary.overtimeHours.toFixed(2)}
          </p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">Est. net (if paid)</p>
          <p className="text-lg font-bold text-green-950">
            {payPreview
              ? formatCurrency(payPreview.payroll.netPay)
              : '—'}
          </p>
          {payPreview && (
            <p className="text-[11px] text-green-800 mt-1">
              Gross {formatCurrency(payPreview.grossPay)} · PAYG{' '}
              {formatCurrency(payPreview.payroll.taxWithheld)} · Super{' '}
              {formatCurrency(payPreview.payroll.superannuation)}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleCreateTimesheetDraft()}
        disabled={busy || loading || summary.totalHours <= 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
      >
        <FilePlus2 className="w-4 h-4" />
        Create timesheet draft from this period
      </button>

      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Recent punches</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-500">No attendance yet.</p>
        ) : (
          <ul className="divide-y border rounded-md bg-white">
            {recent.map((r) => {
              const hours = r.clockOutAt
                ? (
                    (new Date(r.clockOutAt).getTime() -
                      new Date(r.clockInAt).getTime()) /
                    3600000
                  ).toFixed(2)
                : '—'
              return (
                <li key={r.id} className="px-3 py-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-medium text-gray-900">
                    {formatDateAustralian(toLocalDateKey(r.clockInAt))}
                  </span>
                  <span className="text-gray-600">
                    {toLocalTimeHm(r.clockInAt)}
                    {' → '}
                    {r.clockOutAt ? toLocalTimeHm(r.clockOutAt) : 'open'}
                  </span>
                  <span className="text-gray-800">{hours}h</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
