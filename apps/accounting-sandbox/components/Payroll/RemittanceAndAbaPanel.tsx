/**
 * Phase 5 — remittance due board + ABA download for approved net pays.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Landmark, Loader2, RefreshCw, Save } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { listBankDebitsFromStatements } from '@/lib/payroll/patch-bank-transaction'
import {
  loadAbaPaymentSettings,
  saveAbaPaymentSettings,
  type AbaPaymentSettings,
} from '@/lib/payroll/aba-settings'
import {
  buildAbaFile,
  inferFinancialInstitutionFromBsb,
  type AbaPaymentLine,
} from '@/src/features/payroll/aba-export'
import { computeRemittanceDue } from '@/src/features/payroll/remittance-due'
import type { Payslip } from '@/src/features/payroll/types'
import type { Employee } from '@/src/shared/types/employee'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

export function RemittanceAndAbaPanel() {
  const [summary, setSummary] = useState(() => computeRemittanceDue([], []))
  const [approvedLines, setApprovedLines] = useState<
    Array<Payslip & { bsb?: string; accountNumber?: string; accountName?: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [abaSettings, setAbaSettings] = useState<AbaPaymentSettings>(() =>
    loadAbaPaymentSettings()
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      await indexedDBStorage.init()
      const [payslips, employees, bankDebits] = await Promise.all([
        indexedDBStorage.getAllPayslips(),
        indexedDBStorage.getAllEmployees(true),
        listBankDebitsFromStatements(),
      ])
      const empMap = new Map<string, Employee>()
      for (const e of employees as Employee[]) {
        empMap.set(e.id, e)
        empMap.set(e.employeeId, e)
      }

      const slips = payslips as Payslip[]
      setSummary(computeRemittanceDue(slips, bankDebits))

      const awaiting = slips
        .filter((p) => p.status === 'approved')
        .map((p) => {
          const emp = empMap.get(p.employeeId)
          return {
            ...p,
            bsb: emp?.bankAccount?.bsb,
            accountNumber: emp?.bankAccount?.accountNumber,
            accountName: emp?.bankAccount?.accountName || emp?.name || p.employeeName,
          }
        })
      setApprovedLines(awaiting)
    } catch (err) {
      console.error('[RemittanceAndAbaPanel]', err)
      setMessage(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setAbaSettings(loadAbaPaymentSettings())
    void refresh()
    const onUpdate = () => void refresh()
    const onAba = () => setAbaSettings(loadAbaPaymentSettings())
    window.addEventListener('timesheetStatusUpdated', onUpdate)
    window.addEventListener('transactionsUpdated', onUpdate)
    window.addEventListener('abaPaymentSettingsUpdated', onAba)
    return () => {
      window.removeEventListener('timesheetStatusUpdated', onUpdate)
      window.removeEventListener('transactionsUpdated', onUpdate)
      window.removeEventListener('abaPaymentSettingsUpdated', onAba)
    }
  }, [refresh])

  const abaReadyCount = useMemo(
    () => approvedLines.filter((l) => l.bsb && l.accountNumber && l.netPay > 0).length,
    [approvedLines]
  )

  const updateAbaField = <K extends keyof AbaPaymentSettings>(
    key: K,
    value: AbaPaymentSettings[K]
  ) => {
    setAbaSettings((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'bsb') {
        next.financialInstitution = inferFinancialInstitutionFromBsb(String(value))
      }
      return next
    })
  }

  const persistAbaSettings = () => {
    saveAbaPaymentSettings(abaSettings)
    setMessage('ABA funding account settings saved.')
  }

  const downloadAba = () => {
    setBusy(true)
    setMessage(null)
    try {
      const payments: AbaPaymentLine[] = approvedLines
        .filter((l) => l.bsb && l.accountNumber && l.netPay > 0)
        .map((l) => ({
          bsb: l.bsb!,
          accountNumber: l.accountNumber!,
          accountName: l.accountName || l.employeeName,
          amount: l.netPay,
          lodgementReference: `PAY ${l.employeeId}`.slice(0, 18),
        }))

      if (payments.length === 0) {
        setMessage(
          'No approved payslips with BSB/account. Add bank details on employees and approve a Pay Run first.'
        )
        return
      }

      saveAbaPaymentSettings(abaSettings)

      const content = buildAbaFile(
        {
          financialInstitution:
            abaSettings.financialInstitution ||
            inferFinancialInstitutionFromBsb(abaSettings.bsb),
          userName: abaSettings.userName,
          userIdNumber: abaSettings.userIdNumber,
          bsb: abaSettings.bsb,
          accountNumber: abaSettings.accountNumber,
          remitterName: abaSettings.remitterName,
        },
        payments
      )

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-aba-${new Date().toISOString().slice(0, 10)}.aba`
      a.click()
      URL.revokeObjectURL(url)
      setMessage(
        `Downloaded ABA with ${payments.length} payment(s). Validate with your bank before uploading.`
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ABA export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Remittance &amp; ABA payment
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Track PAYG / Super still owed to agencies, and download an ABA file for approved
            staff net pays. Agency lodgment (STP / SuperStream) stays outside this app — use
            Bank ↔ Pay Run match after money leaves the account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">Net still to transfer</p>
          <p className="text-lg font-bold text-green-950">
            {formatCurrency(summary.netAwaitingTransfer)}
          </p>
          <p className="text-xs text-green-800 mt-1">
            {summary.netAwaitingCount} approved payslip(s)
          </p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">PAYG due (accrued − cleared)</p>
          <p className="text-lg font-bold text-red-950">
            {formatCurrency(summary.paygDue)}
          </p>
          <p className="text-xs text-red-800 mt-1">
            Accrued {formatCurrency(summary.paygAccrued)} · Cleared{' '}
            {formatCurrency(summary.paygCleared)}
          </p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">Super due (accrued − cleared)</p>
          <p className="text-lg font-bold text-blue-950">
            {formatCurrency(summary.superDue)}
          </p>
          <p className="text-xs text-blue-800 mt-1">
            Accrued {formatCurrency(summary.superAccrued)} · Cleared{' '}
            {formatCurrency(summary.superCleared)}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-800">ABA funding account (persisted)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">User ID (6 digits)</label>
            <input
              value={abaSettings.userIdNumber}
              onChange={(e) =>
                updateAbaField('userIdNumber', e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              placeholder="000000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">BSB</label>
            <input
              value={abaSettings.bsb}
              onChange={(e) => updateAbaField('bsb', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Account number</label>
            <input
              value={abaSettings.accountNumber}
              onChange={(e) => updateAbaField('accountNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">User name</label>
            <input
              value={abaSettings.userName}
              onChange={(e) => updateAbaField('userName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Remitter name (max 16)</label>
            <input
              value={abaSettings.remitterName}
              onChange={(e) => updateAbaField('remitterName', e.target.value.slice(0, 16))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              maxLength={16}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Financial institution</label>
            <input
              value={abaSettings.financialInstitution}
              onChange={(e) =>
                updateAbaField('financialInstitution', e.target.value.toUpperCase().slice(0, 3))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              maxLength={3}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={persistAbaSettings}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-white flex items-center gap-2 bg-white"
          >
            <Save className="w-4 h-4" />
            Save ABA settings
          </button>
          <button
            type="button"
            onClick={downloadAba}
            disabled={busy || abaReadyCount === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download ABA ({abaReadyCount})
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-4">Loading…</p>
      ) : approvedLines.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          No approved (unpaid) payslips. Run a Pay Run batch approve first.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">BSB / Account</th>
                <th className="px-3 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {approvedLines.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.employeeName}</div>
                    <div className="text-xs text-gray-500">{l.employeeId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatDateAustralian(l.payPeriod.start)} –{' '}
                    {formatDateAustralian(l.payPeriod.end)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.bsb && l.accountNumber ? (
                      `${l.bsb} / ${l.accountNumber}`
                    ) : (
                      <span className="text-amber-700">Missing bank details</span>
                    )}
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
