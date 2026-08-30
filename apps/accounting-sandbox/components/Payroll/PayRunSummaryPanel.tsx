/**
 * Pay Run board — approved vs paid totals for people-ops (Phase 1).
 * Bank matching / remittance files come in later phases.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, RefreshCw } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { summarizePayRun } from '@/src/features/payroll/pay-run-summary'
import type { Payslip } from '@/src/features/payroll/types'
import { formatCurrency } from '@/lib/utils/currency-format'

export function PayRunSummaryPanel() {
  const [summary, setSummary] = useState(() => summarizePayRun([]))
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await indexedDBStorage.init()
      const payslips = (await indexedDBStorage.getAllPayslips()) as Payslip[]
      setSummary(summarizePayRun(payslips))
    } catch (err) {
      console.error('[PayRunSummaryPanel]', err)
      setSummary(summarizePayRun([]))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener('timesheetStatusUpdated', onUpdate)
    window.addEventListener('transactionsUpdated', onUpdate)
    return () => {
      window.removeEventListener('timesheetStatusUpdated', onUpdate)
      window.removeEventListener('transactionsUpdated', onUpdate)
    }
  }, [refresh])

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-blue-600" />
            Pay Run Summary
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Confirmed payroll amounts before bank transfer. Mark timesheets Paid after
            you pay staff; match bank outflows later so books stay in sync.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">Awaiting payment</p>
          <p className="text-lg font-bold text-amber-950">
            {summary.awaitingPayment.count}
          </p>
          <p className="text-sm text-amber-900 mt-1">
            Net {formatCurrency(summary.netAwaitingBankTransfer)}
          </p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">Marked paid</p>
          <p className="text-lg font-bold text-green-950">{summary.paid.count}</p>
          <p className="text-sm text-green-900 mt-1">
            Net {formatCurrency(summary.paid.netPay)}
          </p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">PAYG accrued (scope)</p>
          <p className="text-lg font-bold text-red-950">
            {formatCurrency(summary.paygAccrued)}
          </p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">Super accrued (scope)</p>
          <p className="text-lg font-bold text-blue-950">
            {formatCurrency(summary.superAccrued)}
          </p>
        </div>
      </div>
    </div>
  )
}
