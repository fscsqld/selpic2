/**
 * Period lock helpers — enforce locked-period edit rules and dashboard filtering.
 *
 * Open-period sync must:
 * 1. hydrateFundedByDirectorOnLedger (cash director-paid rows count toward DL)
 * 2. apply Settings opening only via monthly chain / seedOpeningsBeforePeriod
 * 3. never mint OCR junk period ids (257-10)
 */

import { FinancialPeriod } from '../storage/period-types'
import { indexedDBStorage } from '../storage/indexed-db'
import {
  generatePeriodId,
  createOrUpdatePeriod,
  getReceivablesToCarryForward,
  isValidPeriodId,
  previousPeriodId,
  computePeriodDirectorLoanChain,
} from './period-utils'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { hydrateFundedByDirectorOnLedger } from '@/lib/cash-expense/funded-by-director'

export const VIEW_PERIOD_STORAGE_KEY = 'selpic_accounting_view_period_id'
export const PERIOD_CHANGED_EVENT = 'accountingPeriodChanged'

export function generatePeriodIdFromDateString(dateStr: string): string {
  const iso = toIsoDateString(dateStr)
  if (iso) {
    const id = iso.slice(0, 7) // YYYY-MM
    if (isValidPeriodId(id)) return id
  }
  // Never fall back to new Date(ocrJunk) — that minted ids like 257-10 / 267-04.
  return generatePeriodId(new Date())
}

export function getLockedPeriodIds(periods: FinancialPeriod[]): Set<string> {
  return new Set(periods.filter((p) => p.isLocked).map((p) => p.id))
}

export function isDateInLockedPeriod(
  dateStr: string,
  lockedPeriodIds: Set<string>
): boolean {
  return lockedPeriodIds.has(generatePeriodIdFromDateString(dateStr))
}

export function filterTransactionsForPeriod<T extends { date: string }>(
  transactions: T[],
  periodId: string
): T[] {
  return transactions.filter((tx) => {
    const iso = toIsoDateString(tx.date)
    if (!iso) return false
    return iso.startsWith(periodId)
  })
}

export function getViewPeriodIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VIEW_PERIOD_STORAGE_KEY)
}

export function setViewPeriodIdInStorage(periodId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VIEW_PERIOD_STORAGE_KEY, periodId)
  window.dispatchEvent(
    new CustomEvent(PERIOD_CHANGED_EVENT, { detail: { periodId } })
  )
}

/**
 * Opening balances for an open month.
 * Prefer the **immediate prior month** closing (locked or unlocked) so Jul/Aug
 * roll June's DL — never skip unlocked June to an older locked month or bare Settings.
 */
export function seedOpeningsBeforePeriod(
  openPeriodId: string,
  periods: FinancialPeriod[],
  settingsOpeningDirectorLoan: number,
  settingsOpeningCash: number
): { directorLoan: number; cash: number } {
  // Walk backward month-by-month so we never jump past an unlocked June to an
  // older locked row whose closing was still Settings $1,000.
  let cursor = previousPeriodId(openPeriodId)
  while (cursor) {
    const prior = periods.find((p) => p.id === cursor)
    if (prior) {
      return {
        directorLoan: prior.closingDirectorLoanBalance,
        cash: prior.closingCashBalance,
      }
    }
    cursor = previousPeriodId(cursor)
  }
  return {
    directorLoan: settingsOpeningDirectorLoan,
    cash: settingsOpeningCash,
  }
}

export async function syncPeriodFromTransactions(
  periodId: string,
  allTransactions: Array<{ date: string; id?: string; description?: string }>,
  openingDirectorLoan: number,
  openingCash: number
): Promise<FinancialPeriod | null> {
  if (!isValidPeriodId(periodId)) return null

  const existing = await indexedDBStorage.getPeriod(periodId)
  if (existing?.isLocked) {
    return existing
  }

  const periodTransactions = filterTransactionsForPeriod(allTransactions, periodId)
  const period = await createOrUpdatePeriod(
    periodId,
    periodTransactions,
    openingDirectorLoan,
    openingCash
  )

  // Always persist openings on unlocked months (stale $1000 must not stick).
  period.openingDirectorLoanBalance = openingDirectorLoan
  period.openingCashBalance = openingCash

  const receivableIds = getReceivablesToCarryForward(periodTransactions, periodId)
  if (receivableIds.length > 0) {
    period.carriedForwardReceivables = receivableIds
  }

  await indexedDBStorage.savePeriod(period)
  return period
}

/**
 * Recalculate every unlocked month from bank + cash ledger.
 * Hydrates director-funded cash; Settings opening applies via DL chain (first
 * DL month only), not independently on every month.
 */
export async function syncAllOpenPeriods(
  allTransactions: Array<{
    date: string
    id?: string
    description?: string
    debit?: number | null
    credit?: number | null
    category?: string
    department?: string
    source?: string
    fundedByDirector?: boolean
  }>,
  settingsOpeningDirectorLoan = 0,
  settingsOpeningCash = 0,
  manualPriorOnFirstMonth = 0
): Promise<void> {
  const hydrated = hydrateFundedByDirectorOnLedger(allTransactions)
  const storedPeriods = await indexedDBStorage.getAllPeriods()
  const lockedIds = getLockedPeriodIds(storedPeriods)

  const periodIds = new Set<string>()
  for (const tx of hydrated) {
    const id = generatePeriodIdFromDateString(String(tx.date || ''))
    if (isValidPeriodId(id)) periodIds.add(id)
  }
  const currentId = generatePeriodId(new Date())
  if (isValidPeriodId(currentId)) periodIds.add(currentId)

  // Re-sync empty unlocked months already stored (Jul/Aug after June DL must roll).
  for (const p of storedPeriods) {
    if (!p.isLocked && isValidPeriodId(p.id)) periodIds.add(p.id)
  }

  // Build period id set first so chain can roll through empty Jul/Aug.
  const sortedIdsPreview = [...periodIds].filter(isValidPeriodId).sort()
  const throughPeriodId =
    sortedIdsPreview.length > 0 ? sortedIdsPreview[sortedIdsPreview.length - 1] : null

  const chain = computePeriodDirectorLoanChain(
    hydrated,
    settingsOpeningDirectorLoan,
    manualPriorOnFirstMonth,
    throughPeriodId
  )
  for (const id of chain.keys()) {
    if (isValidPeriodId(id)) periodIds.add(id)
  }

  const sortedIds = [...periodIds].filter(isValidPeriodId).sort()
  let workingPeriods = [...storedPeriods]

  for (const periodId of sortedIds) {
    if (lockedIds.has(periodId)) continue

    const seeded = seedOpeningsBeforePeriod(
      periodId,
      workingPeriods,
      settingsOpeningDirectorLoan,
      settingsOpeningCash
    )
    const node = chain.get(periodId)
    // Prefer live chain opening (Settings on first DL month + roll-forward).
    // Fall back to seed when chain has no node (empty month still listed).
    const openingDL = node ? node.opening : seeded.directorLoan
    const openingCash = seeded.cash

    const period = await syncPeriodFromTransactions(
      periodId,
      hydrated,
      openingDL,
      openingCash
    )
    if (!period) continue

    // Chain closing is SSOT when present (includes empty Jul/Aug roll-forward).
    if (node) {
      period.closingDirectorLoanBalance = node.closing
      period.openingDirectorLoanBalance = node.opening
      await indexedDBStorage.savePeriod(period)
    } else {
      // Empty month outside chain span: closing must equal rolled opening, not stale Settings.
      period.closingDirectorLoanBalance = openingDL
      period.openingDirectorLoanBalance = openingDL
      await indexedDBStorage.savePeriod(period)
    }

    workingPeriods = workingPeriods.filter((p) => p.id !== periodId).concat(period)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERIOD_CHANGED_EVENT, { detail: { source: 'syncAllOpenPeriods' } }))
  }
}

export async function preparePeriodForClose(
  periodId: string,
  allTransactions: Array<{ date: string; id?: string; description?: string }>,
  settingsOpeningDirectorLoan = 0,
  settingsOpeningCash = 0
): Promise<FinancialPeriod> {
  const hydrated = hydrateFundedByDirectorOnLedger(allTransactions as any[])
  const periods = await indexedDBStorage.getAllPeriods()
  const seeded = seedOpeningsBeforePeriod(
    periodId,
    periods,
    settingsOpeningDirectorLoan,
    settingsOpeningCash
  )
  const chain = computePeriodDirectorLoanChain(hydrated, settingsOpeningDirectorLoan, 0)
  const node = chain.get(periodId)
  const period = await syncPeriodFromTransactions(
    periodId,
    hydrated,
    node?.opening ?? seeded.directorLoan,
    seeded.cash
  )
  if (!period) {
    throw new Error(`Period ${periodId} could not be prepared for closing`)
  }
  return period
}
