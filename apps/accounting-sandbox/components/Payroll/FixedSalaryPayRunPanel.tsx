/**
 * Create submitted timesheets for salaried staff for a pay period.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, Loader2, RefreshCw } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  buildSubmittedSalaryTimesheet,
  isSalariedEmployee,
} from '@/src/features/payroll/fixed-salary'
import { calculatePayroll } from '@/src/features/payroll/calculator'
import {
  endOfMonth,
  startOfMonth,
  toLocalDateKey,
} from '@/src/features/payroll/attendance'
import type { Employee } from '@/src/shared/types/employee'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

export function FixedSalaryPayRunPanel() {
  const now = new Date()
  const [periodStart, setPeriodStart] = useState(toLocalDateKey(startOfMonth(now)))
  const [periodEnd, setPeriodEnd] = useState(toLocalDateKey(endOfMonth(now)))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const list = ((await indexedDBStorage.getAllEmployees(true)) as Employee[]).filter(
        isSalariedEmployee
      )
      setEmployees(list)
      setSelected(new Set(list.map((e) => e.employeeId)))
    } catch (err) {
      console.error('[FixedSalaryPayRunPanel]', err)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const preview = useMemo(() => {
    return employees
      .filter((e) => selected.has(e.employeeId))
      .map((e) => {
        const gross = e.salaryAmount || 0
        const calc = calculatePayroll(e, gross)
        return { employee: e, ...calc }
      })
  }, [employees, selected])

  const totals = useMemo(() => {
    return preview.reduce(
      (acc, p) => ({
        count: acc.count + 1,
        gross: acc.gross + p.grossPay,
        net: acc.net + p.netPay,
        payg: acc.payg + p.taxWithheld,
        superAmt: acc.superAmt + p.superannuation,
      }),
      { count: 0, gross: 0, net: 0, payg: 0, superAmt: 0 }
    )
  }, [preview])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (preview.length === 0) {
      setMessage('Select at least one salaried employee (set pay basis + salary on Basic Info).')
      return
    }
    if (
      !window.confirm(
        `Create ${preview.length} submitted salary timesheet(s) for ${periodStart} → ${periodEnd}?\n` +
          `Gross ${formatCurrency(totals.gross)} · Net ${formatCurrency(totals.net)}\n\n` +
          `Approve them in Pay Run (batch) next.`
      )
    ) {
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      let created = 0
      for (const row of preview) {
        const ts = buildSubmittedSalaryTimesheet({
          employee: row.employee,
          periodStart,
          periodEnd,
        })
        await indexedDBStorage.saveTimesheet(ts)
        created++
      }
      window.dispatchEvent(
        new CustomEvent('timesheetStatusUpdated', {
          detail: { source: 'fixedSalary', count: created },
        })
      )
      setMessage(
        `Created ${created} submitted timesheet(s). Open Pay Run (batch) to approve.`
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        For staff with <strong>pay basis = salary</strong>. Creates submitted timesheets at the
        fixed gross for the period — no clock-in required. Then approve via Pay Run.
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Period start</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Period end</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-3 py-2 border rounded-md text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Selected</p>
          <p className="font-bold">{totals.count}</p>
        </div>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-600">Gross</p>
          <p className="font-bold">{formatCurrency(totals.gross)}</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">PAYG</p>
          <p className="font-bold">{formatCurrency(totals.payg)}</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">Net</p>
          <p className="font-bold">{formatCurrency(totals.net)}</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-gray-500">
          No salaried employees. Set Pay basis = Salary and Salary amount on employee Basic Info.
        </p>
      ) : (
        <ul className="divide-y border rounded-md bg-white text-sm">
          {employees.map((e) => {
            const calc = calculatePayroll(e, e.salaryAmount || 0)
            return (
              <li key={e.employeeId} className="px-3 py-2 flex flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(e.employeeId)}
                  onChange={() => toggle(e.employeeId)}
                />
                <span className="font-medium flex-1">{e.name}</span>
                <span className="text-xs text-gray-500">{e.payFrequency}</span>
                <span>{formatCurrency(e.salaryAmount || 0)} gross</span>
                <span className="text-green-800 font-medium">
                  Net {formatCurrency(calc.netPay)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={busy || preview.length === 0}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
        Create submitted salary timesheets ({preview.length})
      </button>
      <p className="text-xs text-gray-500">
        Period label: {formatDateAustralian(periodStart)} – {formatDateAustralian(periodEnd)}
      </p>
    </div>
  )
}
