/**
 * Admin attendance — view / edit / add punches for one employee.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, Loader2, Plus, Trash2, Save } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { AttendanceRecord } from '@/src/features/payroll/attendance-types'
import {
  attendanceDurationHours,
  toLocalDateKey,
  toLocalTimeHm,
} from '@/src/features/payroll/attendance'
import type { Employee } from '@/src/shared/types/employee'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface AdminAttendancePanelProps {
  employee: Employee
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(local: string): string {
  const d = new Date(local)
  return d.toISOString()
}

export function AdminAttendancePanel({ employee }: AdminAttendancePanelProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draftIn, setDraftIn] = useState('')
  const [draftOut, setDraftOut] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const rows = (await indexedDBStorage.getAttendanceRecords(
        employee.employeeId
      )) as AttendanceRecord[]
      setRecords(rows)
    } catch (err) {
      console.error('[AdminAttendancePanel]', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [employee.employeeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveRecord = async (record: AttendanceRecord) => {
    setBusy(true)
    setMessage(null)
    try {
      if (record.clockOutAt) {
        const hrs = attendanceDurationHours(record.clockInAt, record.clockOutAt)
        if (hrs <= 0) {
          setMessage('Clock-out must be after clock-in.')
          return
        }
      }
      await indexedDBStorage.saveAttendanceRecord({
        ...record,
        source: 'admin',
        employeeId: employee.employeeId,
        employeeName: employee.name,
      })
      setMessage('Attendance saved.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async () => {
    if (!draftIn) {
      setMessage('Clock-in time is required.')
      return
    }
    setBusy(true)
    try {
      await indexedDBStorage.saveAttendanceRecord({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        clockInAt: fromDatetimeLocalValue(draftIn),
        clockOutAt: draftOut ? fromDatetimeLocalValue(draftOut) : undefined,
        source: 'admin',
      })
      setDraftIn('')
      setDraftOut('')
      setMessage('Shift added.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this attendance record?')) return
    setBusy(true)
    try {
      await indexedDBStorage.deleteAttendanceRecord(id)
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Attendance (admin)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          View and correct clock times for {employee.name}. Edits are tagged as admin source.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 border rounded-md">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Clock in</label>
          <input
            type="datetime-local"
            value={draftIn}
            onChange={(e) => setDraftIn(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Clock out (optional)</label>
          <input
            type="datetime-local"
            value={draftOut}
            onChange={(e) => setDraftOut(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add shift
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-500">No attendance records.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="p-3 border rounded-md bg-white space-y-2">
              <div className="text-xs text-gray-500">
                {formatDateAustralian(toLocalDateKey(r.clockInAt))} · source {r.source || 'employee'}
                {r.clockOutAt
                  ? ` · ${attendanceDurationHours(r.clockInAt, r.clockOutAt).toFixed(2)}h`
                  : ' · open'}
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">In</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(r.clockInAt)}
                    onChange={(e) => {
                      const next = {
                        ...r,
                        clockInAt: fromDatetimeLocalValue(e.target.value),
                      }
                      setRecords((prev) =>
                        prev.map((x) => (x.id === r.id ? next : x))
                      )
                    }}
                    className="px-2 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Out</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(r.clockOutAt)}
                    onChange={(e) => {
                      const next = {
                        ...r,
                        clockOutAt: e.target.value
                          ? fromDatetimeLocalValue(e.target.value)
                          : undefined,
                      }
                      setRecords((prev) =>
                        prev.map((x) => (x.id === r.id ? next : x))
                      )
                    }}
                    className="px-2 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = records.find((x) => x.id === r.id)
                    if (current) void saveRecord(current)
                  }}
                  disabled={busy}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs flex items-center gap-1"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(r.id)}
                  className="px-3 py-1.5 border rounded-md text-xs text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Display: {toLocalTimeHm(r.clockInAt)}
                {r.clockOutAt ? ` → ${toLocalTimeHm(r.clockOutAt)}` : ' → open'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
