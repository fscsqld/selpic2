/**
 * Batch Pay Run board — preview submitted timesheets, approve selected, export CSV (Phase 3).
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getSSOToken } from '@/lib/sso-handler'
import { approveSubmittedTimesheetsBatch } from '@/lib/payroll/approve-timesheet'
import {
  buildPayRunNetPayCsv,
  buildPayRunPreviewLines,
  summarizePayRunPreviewLines,
  type PayRunPreviewLine,
} from '@/src/features/payroll/pay-run-batch'
import {
  endOfWeekSunday,
  startOfWeekMonday,
  toLocalDateKey,
} from '@/src/features/payroll/attendance'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'
import type { Employee } from '@/src/shared/types/employee'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

function defaultWeekRange() {
  const now = new Date()
  return {
    start: toLocalDateKey(startOfWeekMonday(now)),
    end: toLocalDateKey(endOfWeekSunday(now)),
  }
}

export function PayRunBoard() {
  const week = defaultWeekRange()
  const [rangeStart, setRangeStart] = useState(week.start)
  const [rangeEnd, setRangeEnd] = useState(week.end)
  const [lines, setLines] = useState<PayRunPreviewLine[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = getSSOToken()
    if (token && (token.role === 'admin' || token.role === 'super_admin')) {
      setIsAdmin(true)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setStatusMsg(null)
    try {
      await indexedDBStorage.init()
      const [timesheets, employees] = await Promise.all([
        indexedDBStorage.getAllTimesheets(),
        indexedDBStorage.getAllEmployees(true),
      ])
      const map = new Map<string, Employee>()
      for (const e of employees as Employee[]) {
        map.set(e.employeeId, e)
      }
      setLines(
        buildPayRunPreviewLines(
          timesheets as Timesheet[],
          map,
          rangeStart,
          rangeEnd
        )
      )
    } catch (err) {
      console.error('[PayRunBoard]', err)
      setLines([])
      setStatusMsg(err instanceof Error ? err.message : 'Failed to load pay run')
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener('timesheetStatusUpdated', onUpdate)
    return () => window.removeEventListener('timesheetStatusUpdated', onUpdate)
  }, [refresh])

  const totals = useMemo(() => summarizePayRunPreviewLines(lines, true), [lines])
  const selectedIds = useMemo(
    () => lines.filter((l) => l.selected).map((l) => l.timesheetId),
    [lines]
  )

  const toggleLine = (timesheetId: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.timesheetId === timesheetId ? { ...l, selected: !l.selected } : l
      )
    )
  }

  const toggleAll = (selected: boolean) => {
    setLines((prev) => prev.map((l) => ({ ...l, selected })))
  }

  const handleApproveSelected = async () => {
    if (!isAdmin) {
      alert('Administrator privileges required.')
      return
    }
    const token = getSSOToken()
    if (!token) {
      alert('Login required.')
      return
    }
    if (selectedIds.length === 0) {
      alert('Select at least one timesheet.')
      return
    }

    const confirmed = window.confirm(
      `Approve ${selectedIds.length} timesheet(s) as a Pay Run?\n\n` +
        `Gross ${formatCurrency(totals.grossPay)} · PAYG ${formatCurrency(totals.taxWithheld)} · ` +
        `Super ${formatCurrency(totals.superannuation)} · Net ${formatCurrency(totals.netPay)}\n\n` +
        `This creates accrual journals only (no cash). Mark Paid after you transfer net pay.`
    )
    if (!confirmed) return

    setProcessing(true)
    setStatusMsg(null)
    try {
      const { ok, errors } = await approveSubmittedTimesheetsBatch(
        selectedIds,
        token.username
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('timesheetStatusUpdated', {
            detail: { source: 'payRunBatch', count: ok.length },
          })
        )
        window.dispatchEvent(
          new CustomEvent('transactionsUpdated', {
            detail: { source: 'payRunBatch', count: ok.length },
          })
        )
      }
      setStatusMsg(
        `Approved ${ok.length} of ${selectedIds.length}.` +
          (errors.length
            ? ` ${errors.length} failed: ${errors.map((e) => e.message).join('; ')}`
            : '')
      )
      await refresh()
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Batch approve failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadCsv = () => {
    if (selectedIds.length === 0) {
      alert('Select at least one line to export.')
      return
    }
    const csv = buildPayRunNetPayCsv(lines)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pay-run-net-${rangeStart}_${rangeEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Pay Run (batch)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Preview all <strong>submitted</strong> timesheets overlapping this period, confirm
            amounts, approve together, then transfer net pay and Mark Paid. Export CSV for bank
            prep (ABA comes later).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || processing}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Period start</label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Period end</label>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const w = defaultWeekRange()
            setRangeStart(w.start)
            setRangeEnd(w.end)
          }}
          className="px-3 py-2 text-sm text-blue-700 hover:underline"
        >
          This week
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Selected</p>
          <p className="text-lg font-bold">{totals.count}</p>
        </div>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Gross</p>
          <p className="text-lg font-bold">{formatCurrency(totals.grossPay)}</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">PAYG</p>
          <p className="text-lg font-bold text-red-950">
            {formatCurrency(totals.taxWithheld)}
          </p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">Net to pay</p>
          <p className="text-lg font-bold text-green-950">
            {formatCurrency(totals.netPay)}
          </p>
        </div>
      </div>
      <p className="text-sm text-blue-900">
        Super (employer) selected total:{' '}
        <strong>{formatCurrency(totals.superannuation)}</strong>
      </p>

      {statusMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {statusMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleApproveSelected()}
          disabled={!isAdmin || processing || selectedIds.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Approve selected ({selectedIds.length})
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Download net-pay CSV
        </button>
        <button
          type="button"
          onClick={() => toggleAll(true)}
          className="px-3 py-2 text-sm text-gray-700 hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => toggleAll(false)}
          className="px-3 py-2 text-sm text-gray-700 hover:underline"
        >
          Clear
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No submitted timesheets overlapping{' '}
          {formatDateAustralian(rangeStart)} – {formatDateAustralian(rangeEnd)}.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2">Sel</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-right">Hours</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">PAYG</th>
                <th className="px-3 py-2 text-right">Super</th>
                <th className="px-3 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((l) => (
                <tr key={l.timesheetId} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={l.selected}
                      onChange={() => toggleLine(l.timesheetId)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{l.employeeName}</div>
                    <div className="text-xs text-gray-500">{l.employeeId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {formatDateAustralian(l.payPeriodStart)} –{' '}
                    {formatDateAustralian(l.payPeriodEnd)}
                  </td>
                  <td className="px-3 py-2 text-right">{l.totalHours.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.grossPay)}</td>
                  <td className="px-3 py-2 text-right text-red-700">
                    {formatCurrency(l.taxWithheld)}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700">
                    {formatCurrency(l.superannuation)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-800">
                    {formatCurrency(l.netPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
