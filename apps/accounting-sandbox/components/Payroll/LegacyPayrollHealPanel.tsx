/**
 * One-click heal of legacy payroll ASSET_CASH credit journals.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Wrench } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { isLegacyPayrollCashCredit } from '@/src/features/payroll/bookkeeping'
import {
  countLegacyPayrollCashCredits,
  healLegacyPayrollCashCreditTx,
} from '@/lib/payroll/heal-legacy-payroll-cash'

export function LegacyPayrollHealPanel() {
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      await indexedDBStorage.init()
      const txs = await indexedDBStorage.getAllTransactions()
      setCount(countLegacyPayrollCashCredits(txs))
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleHeal = async () => {
    if (count === 0) return
    if (
      !window.confirm(
        `Convert ${count} legacy payroll cash credit(s) to Wages Payable?\n\n` +
          `This aligns old approves with the accrual model (cash comes from the bank statement).`
      )
    ) {
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await indexedDBStorage.init()
      const txs = await indexedDBStorage.getAllTransactions()
      let healed = 0
      for (const tx of txs) {
        if (!isLegacyPayrollCashCredit(tx) || !tx.id) continue
        const next = healLegacyPayrollCashCreditTx(tx)
        if (!next) continue
        await indexedDBStorage.saveTransaction(next)
        healed++
      }
      window.dispatchEvent(
        new CustomEvent('transactionsUpdated', {
          detail: { source: 'legacyPayrollHeal', count: healed },
        })
      )
      setMessage(`Healed ${healed} journal line(s).`)
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Heal failed')
    } finally {
      setBusy(false)
    }
  }

  if (count === 0 && !message) {
    return (
      <p className="text-sm text-gray-500">
        No legacy payroll cash credits found. New approves already use Wages Payable.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Found <strong>{count}</strong> legacy payroll line(s) that credited Cash on approve.
          Healing moves them to <strong>Wages Payable</strong> so bank matching stays consistent.
        </p>
      </div>
      {message && (
        <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-md p-3">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleHeal()}
        disabled={busy || count === 0}
        className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
        Heal legacy cash journals ({count})
      </button>
    </div>
  )
}
