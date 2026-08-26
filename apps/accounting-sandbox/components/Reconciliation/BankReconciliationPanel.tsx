'use client'

import { useEffect, useMemo, useState } from 'react'
import { Landmark, CheckCircle2, AlertTriangle, RefreshCw, Lock, Unlock } from 'lucide-react'
import {
  completeBankReconciliation,
  computeReconciliationDifference,
  filterTransactionsForPeriod,
  getDefaultReconciliationPeriodId,
  getOrCreateBankReconciliation,
  getTransactionKey,
  setAllClearedTransactions,
  toggleClearedTransaction,
  unlockBankReconciliation,
} from '@/lib/subledger/bank-reconciliation'
import type { BankReconciliationSession } from '@/src/shared/types/subledger'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { cleanTransactionDescription } from '@/lib/dashboard/clean-transaction-description'

interface ReconTransaction {
  id?: string
  date: string
  description: string
  debit?: number | null
  credit?: number | null
  balance?: number | null
}

interface BankReconciliationPanelProps {
  transactions: ReconTransaction[]
  openingCashBalance?: number
  defaultPeriodId?: string
  onChanged?: () => void
}

export function BankReconciliationPanel({
  transactions,
  openingCashBalance = 0,
  defaultPeriodId,
  onChanged,
}: BankReconciliationPanelProps) {
  const [periodId, setPeriodId] = useState(defaultPeriodId || getDefaultReconciliationPeriodId())
  const [session, setSession] = useState<BankReconciliationSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isTogglingAll, setIsTogglingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodTransactions = useMemo(
    () => filterTransactionsForPeriod(transactions, periodId),
    [transactions, periodId]
  )

  const periodKeys = useMemo(
    () => periodTransactions.map((tx, index) => getTransactionKey(tx, index)),
    [periodTransactions]
  )

  const difference = useMemo(() => {
    if (!session) return 0
    return computeReconciliationDifference(session, periodTransactions)
  }, [session, periodTransactions])

  const loadSession = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const row = await getOrCreateBankReconciliation(periodId, transactions, openingCashBalance)
      setSession(row)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSession()
  }, [periodId, transactions, openingCashBalance])

  const handleToggle = async (key: string) => {
    if (!session) return
    try {
      const updated = await toggleClearedTransaction(session.id, key, transactions)
      setSession(updated)
      onChanged?.()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const allCleared =
    periodKeys.length > 0 &&
    periodKeys.every((key) => session?.clearedTransactionIds.includes(key))

  const someCleared =
    !allCleared && periodKeys.some((key) => session?.clearedTransactionIds.includes(key))

  const handleToggleAll = async () => {
    if (!session || session.status === 'completed' || periodKeys.length === 0) return
    try {
      setIsTogglingAll(true)
      const updated = await setAllClearedTransactions(session.id, transactions, !allCleared)
      setSession(updated)
      onChanged?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsTogglingAll(false)
    }
  }

  const handleUnlock = async () => {
    if (!session) return
    if (
      !confirm(
        `Unlock bank reconciliation for ${periodId}?\n\n` +
          `Cleared ticks stay as they are, but you can edit them again and re-complete when ready.`
      )
    ) {
      return
    }

    try {
      setIsUnlocking(true)
      const updated = await unlockBankReconciliation(session.id, transactions)
      setSession(updated)
      alert(`Bank reconciliation for ${periodId} unlocked.`)
      onChanged?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleComplete = async () => {
    if (!session) return
    if (
      !confirm(
        `Mark bank reconciliation for ${periodId} as complete?\n\n` +
          `Cleared: ${session.clearedTransactionIds.length} / ${periodTransactions.length}\n` +
          `Difference: ${formatCurrency(difference)}\n\n` +
          `After completing, cleared ticks for this period cannot be edited.`
      )
    ) {
      return
    }

    try {
      setIsCompleting(true)
      const updated = await completeBankReconciliation(session.id, transactions)
      setSession(updated)
      if (updated.status !== 'completed') {
        alert(
          `Reconciliation was not marked complete.\n\n` +
            `Difference is still ${formatCurrency(updated.difference)}. ` +
            `Clear all matching bank lines (or fix Opening) until Difference is about $0.00.`
        )
      } else {
        alert(`Bank reconciliation for ${periodId} marked complete.`)
      }
      onChanged?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsCompleting(false)
    }
  }

  const clearedCount = session
    ? periodKeys.filter((key) => session.clearedTransactionIds.includes(key)).length
    : 0
  const isBalanced = Math.abs(difference) < 0.02
  const isCompleted = session?.status === 'completed'

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600" />
            Bank Reconciliation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Mark cleared items and compare against the statement closing balance. Use the Clear
            header checkbox to select or clear all rows at once.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Period</label>
          <input
            type="month"
            className="input w-auto"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
          <button type="button" onClick={() => void loadSession()} className="btn-secondary p-2" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {session && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-gray-500">Statement closing</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(session.statementClosingBalance)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-gray-500">Cleared items</div>
            <div className="text-lg font-semibold">{clearedCount} / {periodTransactions.length}</div>
          </div>
          <div className={`rounded-lg border p-3 ${isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className={isBalanced ? 'text-emerald-700' : 'text-amber-700'}>Difference</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(difference)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-gray-500">Status</div>
            <div className="text-lg font-semibold capitalize flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              {session.status}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 px-3 w-16">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allCleared}
                    ref={(el) => {
                      if (el) el.indeterminate = someCleared
                    }}
                    disabled={isCompleted || periodKeys.length === 0 || isTogglingAll}
                    onChange={() => void handleToggleAll()}
                    title={allCleared ? 'Unclear all' : 'Clear all'}
                    aria-label={allCleared ? 'Unclear all transactions' : 'Clear all transactions'}
                  />
                  <span className="text-xs font-medium text-gray-600">Clear</span>
                </label>
              </th>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3 text-right">Debit</th>
              <th className="py-2 px-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {periodTransactions.map((tx, index) => {
              const key = getTransactionKey(tx, index)
              const cleared = session?.clearedTransactionIds.includes(key) ?? false
              return (
                <tr key={key} className={`border-b border-gray-100 ${cleared ? 'bg-emerald-50/60' : ''}`}>
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={cleared}
                      disabled={isCompleted}
                      onChange={() => void handleToggle(key)}
                      aria-label={`Clear ${cleanTransactionDescription(tx.description)}`}
                    />
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatDateAustralian(tx.date)}</td>
                  <td className="py-2 px-3">{cleanTransactionDescription(tx.description)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{tx.debit ? formatCurrency(tx.debit) : '—'}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{tx.credit ? formatCurrency(tx.credit) : '—'}</td>
                </tr>
              )
            })}
            {!isLoading && periodTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No transactions in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isCompleted && (
        <button
          type="button"
          onClick={() => void handleComplete()}
          disabled={!session || isCompleting || isLoading}
          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
        >
          {isCompleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Completing reconciliation...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Mark reconciliation complete
            </>
          )}
        </button>
      )}

      {isCompleted && (
        <div className="space-y-3">
          <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Reconciliation complete
          </div>
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={!session || isUnlocking || isLoading}
            className="w-full px-4 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            {isUnlocking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Unlock &amp; Edit reconciliation
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Use Unlock if you completed this period by mistake. Cleared ticks are kept until you change them.
          </p>
        </div>
      )}
    </div>
  )
}
