'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Calendar, Lock, Unlock, ArrowRight, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { FinancialPeriod } from '@/lib/storage/period-types'
import {
  getCurrentPeriodDates,
  generatePeriodId,
  closePeriodAndCarryForward,
  createOrUpdatePeriod,
  isValidPeriodId,
  healPeriodCalendarDates,
  formatDirectorLoanCaption,
  summarizePeriodActivity,
  computePeriodDirectorLoanChain,
  previousPeriodId,
} from '@/lib/period-management/period-utils'
import { PERIOD_CHANGED_EVENT, syncAllOpenPeriods } from '@/lib/period-management/period-lock'
import { loadAllTransactions } from '@/lib/storage/load-all-transactions'
import { loadDirectorLoanAdvanceSettings } from '@/lib/classification/directors-loan-balance'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'

export function PeriodManagement() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<FinancialPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([])
  /** Prevents sync → PERIOD_CHANGED → sync loops that flicker the screen. */
  const syncInFlightRef = useRef(false)
  const hasLoadedOnceRef = useRef(false)

  const loadPeriods = useCallback(async (opts?: { quiet?: boolean }) => {
    try {
      // Only full-page spinner on first load — quiet reloads avoid flicker.
      if (!opts?.quiet && !hasLoadedOnceRef.current) {
        setIsLoading(true)
      }
      let allPeriods = await indexedDBStorage.getAllPeriods()

      // Purge OCR junk ids (257-10, 267-04, …) and heal UTC-shifted calendar dates
      // (e.g. 2026-08 stored as 31/07–30/08). Applies for every merchant IndexedDB.
      let removedJunk = 0
      let healedDates = 0
      const cleaned: FinancialPeriod[] = []
      for (const period of allPeriods) {
        if (!isValidPeriodId(period.id)) {
          try {
            await indexedDBStorage.deletePeriod(period.id)
            removedJunk += 1
          } catch (err) {
            console.warn('[PeriodManagement] Failed to delete junk period', period.id, err)
          }
          continue
        }
        const healed = healPeriodCalendarDates(period)
        if (healed.startDate !== period.startDate || healed.endDate !== period.endDate) {
          try {
            await indexedDBStorage.savePeriod(healed)
            healedDates += 1
          } catch (err) {
            console.warn('[PeriodManagement] Failed to heal period dates', period.id, err)
          }
          cleaned.push(healed)
        } else {
          cleaned.push(period)
        }
      }
      allPeriods = cleaned
      if (removedJunk > 0 || healedDates > 0) {
        console.info(
          `[PeriodManagement] Removed OCR/junk period rows: ${removedJunk}; healed date bounds: ${healedDates}`
        )
      }

      let current = await indexedDBStorage.getCurrentPeriod()

      // New browsers / cleared storage: seed the current calendar month so the
      // panel is not an empty “No periods” dead-end (same UX as before close-only).
      if (allPeriods.length === 0) {
        const { periodId } = getCurrentPeriodDates()
        await createOrUpdatePeriod(periodId, [], 0, 0)
        allPeriods = await indexedDBStorage.getAllPeriods()
        current = await indexedDBStorage.getCurrentPeriod()
      }

      if (current && !isValidPeriodId(current.id)) {
        current =
          allPeriods.find((period) => !period.isLocked) ||
          allPeriods[allPeriods.length - 1] ||
          null
      }

      setPeriods(allPeriods)
      setCurrentPeriod(current)

      if (current) {
        setSelectedPeriodId(current.id)
      } else {
        const { periodId } = getCurrentPeriodDates()
        setSelectedPeriodId(periodId)
      }
    } catch (err) {
      console.error('Failed to load periods:', err)
    } finally {
      hasLoadedOnceRef.current = true
      setIsLoading(false)
    }
  }, [])

  /** One-shot ledger sync. Never re-enter from PERIOD_CHANGED (that caused flicker). */
  const syncOnceFromLedger = useCallback(async () => {
    if (syncInFlightRef.current) return
    syncInFlightRef.current = true
    try {
      const txs = await loadAllTransactions()
      setLedgerTransactions(txs || [])
      const settingsOpening = Number(localStorage.getItem('opening_director_loan_balance') || '0') || 0
      const openingCash = Number(localStorage.getItem('opening_cash_balance') || '0') || 0
      const { manualPriorAdvances } = loadDirectorLoanAdvanceSettings()
      if ((txs || []).length > 0) {
        await syncAllOpenPeriods(txs || [], settingsOpening, openingCash, manualPriorAdvances)
      }
      await loadPeriods({ quiet: hasLoadedOnceRef.current })
    } catch (err) {
      console.warn('[PeriodManagement] period sync failed', err)
      await loadPeriods({ quiet: hasLoadedOnceRef.current })
    } finally {
      syncInFlightRef.current = false
    }
  }, [loadPeriods])

  useEffect(() => {
    void syncOnceFromLedger()

    // Dashboard/other tabs also sync; only soft-reload IDB — do NOT sync again.
    const onPeriodChanged = () => {
      if (syncInFlightRef.current) return
      void loadAllTransactions()
        .then((txs) => setLedgerTransactions(txs || []))
        .catch(() => {})
      void loadPeriods({ quiet: true })
    }
    window.addEventListener(PERIOD_CHANGED_EVENT, onPeriodChanged)
    return () => window.removeEventListener(PERIOD_CHANGED_EVENT, onPeriodChanged)
  }, [syncOnceFromLedger, loadPeriods])

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm(
      `Close period ${periodId}?\n\n` +
        `After closing, data in this period cannot be edited.\n` +
        `Closing balances will carry forward as the next period’s opening balances.`
    )) {
      return
    }

    try {
      setIsClosing(true)
      const { nextPeriod } = await closePeriodAndCarryForward(periodId, 'owner')
      
      alert(
        `Period closed successfully.\n\n` +
          `Next period (${nextPeriod.id}) was created and closing balances were carried forward.`
      )
      
      await loadPeriods()
    } catch (err: any) {
      console.error('Failed to close period:', err)
      alert(`Failed to close period: ${err.message}`)
    } finally {
      setIsClosing(false)
    }
  }

  const handleUnlockAndResync = async (periodId: string) => {
    if (!confirm(
      `Unlock period ${periodId} and recalculate from the ledger?\n\n` +
        `Use this when a later month was locked while an earlier month is still Active ` +
        `(e.g. July locked at $0 cash while June still holds Closing Cash).\n\n` +
        `Any earlier locked months stuck at $0 cash will be unlocked too so cash can roll forward.`
    )) {
      return
    }

    try {
      setIsClosing(true)
      // Unlock selected month, plus earlier locked $0 cash stubs (Aug → also unlock Jul).
      const toUnlock: string[] = [periodId]
      let cursor = previousPeriodId(periodId)
      while (cursor) {
        const prior = await indexedDBStorage.getPeriod(cursor)
        if (!prior) {
          cursor = previousPeriodId(cursor)
          continue
        }
        if (!prior.isLocked) break
        if (prior.openingCashBalance === 0 && prior.closingCashBalance === 0) {
          toUnlock.push(cursor)
          cursor = previousPeriodId(cursor)
          continue
        }
        break
      }
      const unlockOrder = [...toUnlock].reverse()
      for (const id of unlockOrder) {
        await indexedDBStorage.unlockPeriod(id, 'owner')
      }
      await syncOnceFromLedger()
      alert(
        unlockOrder.length > 1
          ? `Unlocked ${unlockOrder.join(', ')} and recalculated.`
          : `Period ${periodId} unlocked and recalculated.`
      )
    } catch (err: any) {
      console.error('Failed to unlock period:', err)
      alert(`Failed to unlock period: ${err.message}`)
    } finally {
      setIsClosing(false)
    }
  }

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

  const selectedPeriodTxs = useMemo(() => {
    if (!selectedPeriodId) return []
    return ledgerTransactions.filter((tx) => String(tx.date || '').startsWith(selectedPeriodId))
  }, [ledgerTransactions, selectedPeriodId])

  /**
   * Prefer a prior month's closing cash when this month was locked empty at $0
   * (Jul while June Active; Aug while Jul is also a locked $0 stub).
   * Skip locked months that never received a cash carry (open=close=$0).
   */
  const cashCarrySourcePeriod = useMemo(() => {
    if (!selectedPeriodId) return undefined
    let cursor = previousPeriodId(selectedPeriodId)
    while (cursor) {
      const prior = periods.find((p) => p.id === cursor)
      if (!prior) {
        cursor = previousPeriodId(cursor)
        continue
      }
      if (
        prior.isLocked &&
        prior.openingCashBalance === 0 &&
        prior.closingCashBalance === 0
      ) {
        cursor = previousPeriodId(cursor)
        continue
      }
      return prior
    }
    return undefined
  }, [periods, selectedPeriodId])

  const displayOpeningCash = useMemo(() => {
    if (!selectedPeriod) return 0
    if (
      selectedPeriod.openingCashBalance === 0 &&
      cashCarrySourcePeriod &&
      Math.abs(cashCarrySourcePeriod.closingCashBalance) > 0.005
    ) {
      return cashCarrySourcePeriod.closingCashBalance
    }
    return selectedPeriod.openingCashBalance
  }, [selectedPeriod, cashCarrySourcePeriod])

  const displayClosingCash = useMemo(() => {
    if (!selectedPeriod) return 0
    // Empty locked month with no bank txs: closing cash = rolled opening.
    const hasBankTx = selectedPeriodTxs.some(
      (tx) => tx.source !== 'manual' && !String(tx.id || '').startsWith('cash_')
    )
    if (
      !hasBankTx &&
      selectedPeriod.closingCashBalance === 0 &&
      Math.abs(displayOpeningCash) > 0.005
    ) {
      return displayOpeningCash
    }
    return selectedPeriod.closingCashBalance
  }, [selectedPeriod, selectedPeriodTxs, displayOpeningCash])

  const cashCarryLooksStale =
    !!selectedPeriod?.isLocked &&
    selectedPeriod.openingCashBalance === 0 &&
    !!cashCarrySourcePeriod &&
    Math.abs(cashCarrySourcePeriod.closingCashBalance) > 0.005

  const settingsOpeningDirectorLoan = useMemo(() => {
    if (typeof window === 'undefined') return 0
    return Number(localStorage.getItem('opening_director_loan_balance') || '0') || 0
  }, [periods.length, ledgerTransactions.length])

  const liveDirectorLoanChain = useMemo(() => {
    const through =
      [...periods.map((p) => p.id)].sort().at(-1) ||
      [...ledgerTransactions.map((tx) => String(tx.date || '').slice(0, 7)).filter(Boolean)].sort().at(-1) ||
      null
    return computePeriodDirectorLoanChain(
      ledgerTransactions,
      settingsOpeningDirectorLoan,
      loadDirectorLoanAdvanceSettings().manualPriorAdvances,
      through
    )
  }, [ledgerTransactions, settingsOpeningDirectorLoan, periods])

  const closingDirectorLoanFor = (periodId: string, fallback: number) =>
    liveDirectorLoanChain.get(periodId)?.closing ?? fallback

  const openingDirectorLoanFor = (periodId: string, fallback: number) =>
    liveDirectorLoanChain.get(periodId)?.opening ?? fallback

  const selectedPeriodCaption = useMemo(
    () => formatDirectorLoanCaption(closingDirectorLoanFor(selectedPeriodId, selectedPeriod?.closingDirectorLoanBalance ?? 0)),
    [selectedPeriodId, selectedPeriod?.closingDirectorLoanBalance, liveDirectorLoanChain]
  )

  const selectedPeriodActivity = useMemo(
    () => summarizePeriodActivity(selectedPeriodTxs),
    [selectedPeriodTxs]
  )


  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Period Management</h2>
        </div>
      </div>

      {/* Period id / date integrity */}
      <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
        <p className="font-medium text-slate-900 mb-1">Director loan closing balance</p>
        <p>
          Closing figures use company-scoped activity for the selected month, plus any
          <strong> manual prior-period director advances</strong> from Settings → Director&apos;s Loan
          (never a silent Biz Intel lump match into one month).
        </p>
      </div>

      {/* Current Period Status */}
      {currentPeriod && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Current Period: {currentPeriod.id}</span>
            </div>
            {currentPeriod.isLocked ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                <Lock className="w-4 h-4" />
                Locked
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                <Unlock className="w-4 h-4" />
                Active
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <p className="text-gray-600">Period</p>
              <p className="font-semibold">
                {formatDateAustralian(currentPeriod.startDate)} ~ {formatDateAustralian(currentPeriod.endDate)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Opening Director Loan</p>
              <p className="font-semibold">{formatCurrency(openingDirectorLoanFor(currentPeriod.id, currentPeriod.openingDirectorLoanBalance))}</p>
            </div>
            <div>
              <p className="text-gray-600">Closing Director Loan</p>
              <p className="font-semibold">{formatCurrency(closingDirectorLoanFor(currentPeriod.id, currentPeriod.closingDirectorLoanBalance))}</p>
            </div>
            <div>
              <p className="text-gray-600">Accounts Receivable</p>
              <p className="font-semibold text-orange-600">
                {formatCurrency(currentPeriod.accountsReceivable)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Period
        </label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          {periods.length === 0 && (
            <option value="">No periods available</option>
          )}
          {periods.map(period => (
            <option key={period.id} value={period.id}>
              {period.id} {period.isLocked ? '(Locked)' : '(Active)'}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Period Details */}
      {selectedPeriod && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Period Details: {selectedPeriod.id}</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold">{formatDateAustralian(selectedPeriod.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-semibold">{formatDateAustralian(selectedPeriod.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">
                {selectedPeriod.isLocked ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Locked
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1">
                    <Unlock className="w-4 h-4" />
                    Active
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Opening Director Loan</p>
              <p className="font-semibold">{formatCurrency(openingDirectorLoanFor(selectedPeriod.id, selectedPeriod.openingDirectorLoanBalance))}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Closing Director Loan</p>
              <p className="font-semibold">{formatCurrency(closingDirectorLoanFor(selectedPeriod.id, selectedPeriod.closingDirectorLoanBalance))}</p>
              <p className="text-xs text-slate-600 mt-1">{selectedPeriodCaption.label}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Opening Cash</p>
              <p className="font-semibold">{formatCurrency(displayOpeningCash)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Closing Cash</p>
              <p className="font-semibold">{formatCurrency(displayClosingCash)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Opening/Closing Cash track this month&apos;s <strong>company bank cash book</strong> roll-forward
            (prior close → this month&apos;s bank credits/debits). Used for period close / Balance Sheet continuity —
            not Director Loan. Add Cash Expense (director personal pay) does not leave the bank, so it is excluded from cash roll-forward.
          </p>

          <div className="mb-4 p-3 bg-white border border-slate-200 rounded-md text-sm">
            <p className="font-medium text-slate-900 mb-1">This month&apos;s Director Loan activity</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>Bank Director Loan net: {formatCurrency(selectedPeriodActivity.bankDirectorLoanNet)}</li>
              <li>Director-funded cash advances: {formatCurrency(selectedPeriodActivity.directorFundedCashAdvances)}</li>
              <li>Reimbursements to director: {formatCurrency(selectedPeriodActivity.reimbursementsTotal)}</li>
            </ul>
          </div>
          {selectedPeriod.accountsReceivable > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Accounts Receivable (미수금)</p>
              </div>
              <p className="text-lg font-semibold text-orange-700">
                {formatCurrency(selectedPeriod.accountsReceivable)}
              </p>
              {selectedPeriod.carriedForwardReceivables.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {selectedPeriod.carriedForwardReceivables.length} transaction(s) carried forward
                </p>
              )}
            </div>
          )}

          {cashCarryLooksStale && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
              <p className="font-medium">Locked month cash looks stale</p>
              <p className="mt-1">
                This period is Locked with Opening Cash $0, but {cashCarrySourcePeriod?.id} Closing Cash is{' '}
                {formatCurrency(cashCarrySourcePeriod?.closingCashBalance || 0)}. Director Loan may still be correct
                (carried from the prior month), but cash was not carried because an earlier month is still Active
                while this month was locked early.
              </p>
              <p className="mt-1 text-xs">Cash figures above already show the rolled amount for display; unlock to persist.</p>
            </div>
          )}

          {selectedPeriod.isLocked && selectedPeriod.lockedAt && (
            <div className="mb-4 p-3 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-600">
                Locked at: {formatDateAustralian(selectedPeriod.lockedAt)}
              </p>
              {selectedPeriod.lockedBy && (
                <p className="text-sm text-gray-600">
                  Locked by: {selectedPeriod.lockedBy}
                </p>
              )}
            </div>
          )}

          {selectedPeriod.isLocked && (
            <button
              type="button"
              onClick={() => handleUnlockAndResync(selectedPeriod.id)}
              disabled={isClosing}
              className="w-full mb-3 px-4 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Unlock className="w-5 h-5" />
              Unlock & Recalculate from Ledger
            </button>
          )}

          {/* Close Period Button */}
          {!selectedPeriod.isLocked && (
            <button
              onClick={() => handleClosePeriod(selectedPeriod.id)}
              disabled={isClosing}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Closing Period...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Close Period & Carry Forward
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* All Periods List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">All Periods</h3>
        <p className="text-xs text-gray-500 mb-3">
          Active months recalculate from the ledger; Locked months stay frozen until Unlock &amp; Recalculate.
          Opening/Closing Cash is the company bank cash book (prior month close rolls forward even with no
          statements this month). Director Loan is separate. Close Period locks and seeds the next month —
          use Unlock if closed by mistake.
        </p>
        <div className="space-y-2">
          {periods.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No periods created yet</p>
          ) : (
            periods.map(period => (
              <div
                key={period.id}
                className={`p-3 border rounded-md flex items-center justify-between ${
                  period.isLocked ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {period.isLocked ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <p className="font-semibold">{period.id}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateAustralian(period.startDate)} ~ {formatDateAustralian(period.endDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatDirectorLoanCaption(closingDirectorLoanFor(period.id, period.closingDirectorLoanBalance)).label}
                  </p>
                  <p className="text-xs text-slate-600">
                    {formatCurrency(formatDirectorLoanCaption(closingDirectorLoanFor(period.id, period.closingDirectorLoanBalance)).amount)}
                  </p>
                  {period.accountsReceivable > 0 && (
                    <p className="text-xs text-orange-600">
                      Receivables: {formatCurrency(period.accountsReceivable)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
