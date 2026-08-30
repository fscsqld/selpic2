/**
 * Phase 4 UI — match bank outflows to Pay Run nets / remittances and clear liabilities.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link2, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  listBankDebitsFromStatements,
  patchBankStatementTransactionByKey,
} from '@/lib/payroll/patch-bank-transaction'
import {
  buildBankClearPatch,
  buildBankUnclearPatch,
  isUnmatchedWageExpenseRisk,
  suggestPayRunBankMatches,
  type PayRunBankMatchSuggestion,
  type BankDebitLike,
} from '@/src/features/payroll/bank-pay-run-match'
import type { Payslip } from '@/src/features/payroll/types'
import type { Employee } from '@/src/shared/types/employee'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

export function PayrollBankReconcilePanel() {
  const [suggestions, setSuggestions] = useState<PayRunBankMatchSuggestion[]>([])
  const [cleared, setCleared] = useState<BankDebitLike[]>([])
  const [riskCount, setRiskCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      await indexedDBStorage.init()
      const [bankDebits, payslips, employees] = await Promise.all([
        listBankDebitsFromStatements(),
        indexedDBStorage.getAllPayslips(),
        indexedDBStorage.getAllEmployees(true),
      ])
      setSuggestions(
        suggestPayRunBankMatches(
          bankDebits,
          payslips as Payslip[],
          employees as Employee[]
        )
      )
      setCleared(bankDebits.filter((t) => t.clearsPayrollLiability))
      setRiskCount(bankDebits.filter(isUnmatchedWageExpenseRisk).length)
    } catch (err) {
      console.error('[PayrollBankReconcilePanel]', err)
      setSuggestions([])
      setCleared([])
      setMessage(err instanceof Error ? err.message : 'Failed to load')
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

  const highCount = useMemo(
    () => suggestions.filter((s) => s.confidence === 'high').length,
    [suggestions]
  )

  const applySuggestion = async (suggestion: PayRunBankMatchSuggestion) => {
    setBusyKey(suggestion.bankKey)
    setMessage(null)
    try {
      const patch = buildBankClearPatch(suggestion)
      const ok = await patchBankStatementTransactionByKey(suggestion.bankKey, patch)
      if (!ok) {
        setMessage('Could not find that bank line in stored statements.')
        return
      }

      if (suggestion.payslipId) {
        const slips = (await indexedDBStorage.getAllPayslips()) as Payslip[]
        const slip = slips.find((p) => p.id === suggestion.payslipId)
        if (slip) {
          await indexedDBStorage.savePayslip({
            ...slip,
            status: slip.status === 'draft' ? 'approved' : slip.status,
            bankMatchedTransactionKey: suggestion.bankKey,
            bankMatchedAt: new Date().toISOString(),
            ...(slip.status === 'approved' ? { status: 'paid' as const } : {}),
          })
          // If was approved, mark paid via explicit update
          if (slip.status === 'approved') {
            await indexedDBStorage.savePayslip({
              ...slip,
              status: 'paid',
              bankMatchedTransactionKey: suggestion.bankKey,
              bankMatchedAt: new Date().toISOString(),
            })
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('transactionsUpdated', {
            detail: { source: 'payrollBankMatch', bankKey: suggestion.bankKey },
          })
        )
      }
      setMessage(
        `Cleared as ${patch.category} — no longer counted as wage/super expense.`
      )
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Match failed')
    } finally {
      setBusyKey(null)
    }
  }

  const undoClear = async (tx: BankDebitLike) => {
    const key =
      tx.id != null
        ? `id:${tx.id}`
        : `${tx.date}|${tx.description}|${tx.debit}`
    // Prefer bankTxKey from module
    const { bankTxKey } = await import('@/src/features/payroll/bank-pay-run-match')
    const bankKey = bankTxKey(tx)
    setBusyKey(bankKey)
    try {
      const patch = buildBankUnclearPatch(tx)
      await patchBankStatementTransactionByKey(bankKey, patch as any)
      if (tx.matchedPayslipId) {
        const slips = (await indexedDBStorage.getAllPayslips()) as Payslip[]
        const slip = slips.find((p) => p.id === tx.matchedPayslipId)
        if (slip) {
          await indexedDBStorage.savePayslip({
            ...slip,
            bankMatchedTransactionKey: undefined,
            bankMatchedAt: undefined,
          })
        }
      }
      window.dispatchEvent(
        new CustomEvent('transactionsUpdated', {
          detail: { source: 'payrollBankUnmatch', bankKey },
        })
      )
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unmatch failed')
    } finally {
      setBusyKey(null)
    }
  }

  const applyAllHigh = async () => {
    const highs = suggestions.filter((s) => s.confidence === 'high')
    if (highs.length === 0) return
    if (
      !window.confirm(
        `Apply ${highs.length} high-confidence match(es)? Categories become liability clears (not P&L wages).`
      )
    ) {
      return
    }
    for (const s of highs) {
      await applySuggestion(s)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Bank ↔ Pay Run match
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Match company bank salary / ATO / Super outflows to confirmed Pay Run amounts.
            Confirmed matches reclassify the bank line to <strong>clear liabilities</strong>{' '}
            so wages are not counted twice in P&amp;L.
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">Suggestions</p>
          <p className="text-lg font-bold text-amber-950">{suggestions.length}</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">High confidence</p>
          <p className="text-lg font-bold text-green-950">{highCount}</p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">Already cleared</p>
          <p className="text-lg font-bold text-blue-950">{cleared.length}</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">Wage expense still open</p>
          <p className="text-lg font-bold text-red-950">{riskCount}</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={() => void applyAllHigh()}
        disabled={highCount === 0 || loading}
        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
      >
        Apply all high-confidence ({highCount})
      </button>

      {loading ? (
        <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          No open suggestions. Approve a Pay Run first, then upload/refresh bank statements
          that include net pay, ATO, or Super outflows.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2">Bank date</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suggestions.map((s) => (
                <tr key={s.bankKey} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateAustralian(s.bank.date)}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate" title={s.bank.description}>
                    {s.bank.description}
                  </td>
                  <td className="px-3 py-2 text-xs">{s.kind}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-medium ${
                        s.confidence === 'high'
                          ? 'text-green-700'
                          : s.confidence === 'medium'
                            ? 'text-amber-700'
                            : 'text-gray-600'
                      }`}
                    >
                      {s.confidence}
                    </span>
                    <div className="text-xs text-gray-500">{s.reason}</div>
                    {s.employeeName && (
                      <div className="text-xs text-gray-700">{s.employeeName}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(s.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void applySuggestion(s)}
                      disabled={busyKey === s.bankKey}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {busyKey === s.bankKey ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Link2 className="w-3 h-3" />
                      )}
                      Clear liability
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cleared.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Cleared bank lines</h4>
          <ul className="divide-y border rounded-md bg-white text-sm">
            {cleared.slice(0, 20).map((tx) => (
              <li
                key={tx.id || `${tx.date}_${tx.description}`}
                className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {formatDateAustralian(tx.date)} · {tx.description} ·{' '}
                  {formatCurrency(Number(tx.debit))} ·{' '}
                  <span className="text-xs text-blue-700">{tx.category}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void undoClear(tx)}
                  className="px-2 py-1 border rounded-md text-xs flex items-center gap-1 hover:bg-gray-50"
                >
                  <Unlink className="w-3 h-3" />
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
