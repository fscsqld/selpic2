/**
 * Bank reconciliation — cleared items vs statement closing balance.
 *
 * Bank PDF / statement lines only. Add Cash Expense is never listed
 * (company float / director personal pay ≠ bank clear).
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { generatePeriodIdFromDateString } from '@/lib/period-management/period-lock'
import { getPeriodDates, previousPeriodId } from '@/lib/period-management/period-utils'
import type { BankReconciliationSession } from '@/src/shared/types/subledger'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

interface ReconTransaction {
  id?: string
  date: string
  description: string
  debit?: number | null
  credit?: number | null
  balance?: number | null
  source?: string
}

function roundMoney(value: number): number {
  const n = Math.round(value * 100) / 100
  return n === 0 ? 0 : n
}

export function getTransactionKey(tx: ReconTransaction, index: number): string {
  return tx.id || `${tx.date}_${index}_${tx.description}`
}

/** Bank PDF / statement lines only — exclude Add Cash Expense. */
export function filterTransactionsForPeriod<T extends { date: string; id?: string; source?: string }>(
  transactions: T[],
  periodId: string
): T[] {
  return transactions.filter((tx) => {
    if (isManualCashExpenseTx(tx)) return false
    const iso = toIsoDateString(tx.date) || tx.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
    return iso.startsWith(periodId)
  })
}

export function computeLedgerMovement(
  transactions: ReconTransaction[],
  openingBalance: number
): number {
  let balance = openingBalance
  for (const tx of transactions) {
    if (tx.credit) balance += Math.abs(tx.credit)
    if (tx.debit) balance -= Math.abs(tx.debit)
  }
  return roundMoney(balance)
}

/** Prefer last running balance on bank lines in the period. */
export function resolvePeriodStatementClosing(
  periodTransactions: ReconTransaction[],
  statementClosingFallback: number | null | undefined,
  openingCashBalance: number
): number {
  const withBalance = [...periodTransactions]
    .filter((tx) => tx.balance != null && Number.isFinite(Number(tx.balance)))
    .sort((a, b) => {
      const da = toIsoDateString(a.date) || a.date
      const db = toIsoDateString(b.date) || b.date
      return da.localeCompare(db)
    })

  if (withBalance.length > 0) {
    return roundMoney(Number(withBalance[withBalance.length - 1].balance))
  }

  // Stored statement closing of $0 is usually a parse/heal bug (or empty month).
  // Never prefer $0 over opening / computed movement when bank lines exist — and
  // never prefer $0 over opening for empty months (Feb cash-only must roll prior close).
  const fallbackLooksValid =
    statementClosingFallback != null &&
    Number.isFinite(statementClosingFallback) &&
    Math.abs(statementClosingFallback) > 0.005

  if (fallbackLooksValid) {
    return roundMoney(statementClosingFallback)
  }

  // No bank lines this month (e.g. Dec/Feb Cash Expense only) → closing = opening
  if (periodTransactions.length === 0) {
    return roundMoney(openingCashBalance)
  }

  return computeLedgerMovement(periodTransactions, openingCashBalance)
}

export function computeReconciliationDifference(
  session: BankReconciliationSession,
  periodTransactions: ReconTransaction[]
): number {
  const cleared = new Set(session.clearedTransactionIds)
  let clearedBalance = session.ledgerOpeningBalance

  periodTransactions.forEach((tx, index) => {
    const key = getTransactionKey(tx, index)
    if (!cleared.has(key)) return
    if (tx.credit) clearedBalance += Math.abs(tx.credit)
    if (tx.debit) clearedBalance -= Math.abs(tx.debit)
  })

  return roundMoney(session.statementClosingBalance - clearedBalance)
}

/** Net bank movement this month (credits − debits). */
export function periodBankNetMovement(periodTransactions: ReconTransaction[]): number {
  let net = 0
  for (const tx of periodTransactions) {
    if (tx.credit) net += Math.abs(tx.credit)
    if (tx.debit) net -= Math.abs(tx.debit)
  }
  return roundMoney(net)
}

/**
 * Opening implied by statement close − this month's bank net.
 * March: $795.62 − $695.62 = $100 when last-line balance is trustworthy.
 */
export function impliedOpeningFromStatementClose(
  statementClosingBalance: number,
  periodTransactions: ReconTransaction[]
): number {
  return roundMoney(statementClosingBalance - periodBankNetMovement(periodTransactions))
}

function periodHasRunningBalance(periodTransactions: ReconTransaction[]): boolean {
  return periodTransactions.some(
    (tx) => tx.balance != null && Number.isFinite(Number(tx.balance))
  )
}

/**
 * Prefer implied opening when Statement closing comes from running balances
 * (or when rolled opening is $0 but implied is not). Fixes March Diff $100
 * after Jan/Feb completed with stale Statement closing $0.
 */
export function reconcileLedgerOpeningWithStatement(
  rolledOpening: number,
  statementClosingBalance: number,
  periodTransactions: ReconTransaction[]
): number {
  if (periodTransactions.length === 0) return roundMoney(rolledOpening)

  const implied = impliedOpeningFromStatementClose(
    statementClosingBalance,
    periodTransactions
  )

  if (periodHasRunningBalance(periodTransactions)) {
    return implied
  }

  if (Math.abs(rolledOpening) < 0.005 && Math.abs(implied) > 0.005) {
    return implied
  }

  return roundMoney(rolledOpening)
}

/**
 * Opening for this month's recon = prior month bank close (not FY Settings cash).
 * Completing Jan/Feb must feed March opening so Difference can reach $0.
 *
 * Priority:
 * 1. Prior completed recon Statement closing
 * 2. Prior open recon Statement closing (already computed from bank lines)
 * 3. This month's PDF statement openingBalance
 * 4. Prior month computed close from ledger lines
 * 5. Settings FY opening cash
 */
export function pickLedgerOpeningBalance(opts: {
  settingsOpeningCash: number
  statementOpeningBalance?: number | null
  priorReconClosing?: number | null
  priorReconStatus?: 'open' | 'completed' | null
  priorComputedClosing?: number | null
}): number {
  const {
    settingsOpeningCash,
    statementOpeningBalance,
    priorReconClosing,
    priorReconStatus,
    priorComputedClosing,
  } = opts

  if (
    priorReconStatus === 'completed' &&
    priorReconClosing != null &&
    Number.isFinite(priorReconClosing) &&
    Math.abs(priorReconClosing) > 0.005
  ) {
    return roundMoney(priorReconClosing)
  }

  if (
    priorReconClosing != null &&
    Number.isFinite(priorReconClosing) &&
    Math.abs(priorReconClosing) > 0.005
  ) {
    return roundMoney(priorReconClosing)
  }

  if (
    statementOpeningBalance != null &&
    Number.isFinite(statementOpeningBalance) &&
    Math.abs(statementOpeningBalance) > 0.005
  ) {
    return roundMoney(statementOpeningBalance)
  }

  if (
    priorComputedClosing != null &&
    Number.isFinite(priorComputedClosing) &&
    Math.abs(priorComputedClosing) > 0.005
  ) {
    return roundMoney(priorComputedClosing)
  }

  // Completed prior at genuine $0 (empty bank month) — still authoritative.
  if (
    priorReconStatus === 'completed' &&
    priorReconClosing != null &&
    Number.isFinite(priorReconClosing)
  ) {
    return roundMoney(priorReconClosing)
  }

  return roundMoney(settingsOpeningCash)
}

async function resolveLedgerOpeningForPeriod(
  periodId: string,
  transactions: ReconTransaction[],
  settingsOpeningCash: number,
  statementOpeningBalance?: number | null
): Promise<number> {
  const priorId = previousPeriodId(periodId)
  let priorReconClosing: number | null = null
  let priorReconStatus: 'open' | 'completed' | null = null
  let priorComputedClosing: number | null = null

  if (priorId) {
    const priorRecon = await indexedDBStorage.getBankReconciliationByPeriod(priorId)
    if (priorRecon) {
      priorReconClosing = priorRecon.statementClosingBalance
      priorReconStatus = priorRecon.status
    }

    // Fallback when prior recon missing / $0: compute prior month close from bank lines.
    // Prefer last running balance on those lines (does not need a correct prior opening).
    const priorTxs = filterTransactionsForPeriod(transactions, priorId)
    if (priorTxs.length > 0) {
      const statements = await indexedDBStorage.getAllStatements()
      const { periodStart, periodEnd } = periodBounds(priorId)
      const priorStmt = statements.find((stmt) => {
        const end = stmt.period?.endDate
        return end && end >= periodStart && end <= periodEnd
      })
      const priorOpeningForCompute =
        priorRecon && Number.isFinite(priorRecon.ledgerOpeningBalance)
          ? priorRecon.ledgerOpeningBalance
          : settingsOpeningCash
      priorComputedClosing = resolvePeriodStatementClosing(
        priorTxs,
        priorStmt?.closingBalance,
        priorOpeningForCompute
      )
    }
  }

  return pickLedgerOpeningBalance({
    settingsOpeningCash,
    statementOpeningBalance,
    priorReconClosing,
    priorReconStatus,
    priorComputedClosing,
  })
}

function periodBounds(periodId: string): { periodStart: string; periodEnd: string } {
  const [year, month] = periodId.split('-').map(Number)
  const { startDate, endDate } = getPeriodDates(year, month)
  const pad = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { periodStart: pad(startDate), periodEnd: pad(endDate) }
}

export async function getOrCreateBankReconciliation(
  periodId: string,
  transactions: ReconTransaction[],
  openingCashBalance = 0
): Promise<BankReconciliationSession> {
  const { periodStart, periodEnd } = periodBounds(periodId)
  const periodTransactions = filterTransactionsForPeriod(transactions, periodId)
  const statements = await indexedDBStorage.getAllStatements()
  const statementInPeriod = statements.find((stmt) => {
    const end = stmt.period?.endDate
    return end && end >= periodStart && end <= periodEnd
  })

  const statementOpening =
    statementInPeriod?.openingBalance ?? null

  let ledgerOpeningBalance = await resolveLedgerOpeningForPeriod(
    periodId,
    transactions,
    openingCashBalance,
    statementOpening
  )

  const statementClosingBalance = resolvePeriodStatementClosing(
    periodTransactions,
    statementInPeriod?.closingBalance,
    ledgerOpeningBalance
  )

  // Mar 2026: rolled Opening stayed $0 (Feb completed with stale $0 close) while
  // Statement closing $795.62 from NAB fee balance ⇒ implied Opening $100.
  ledgerOpeningBalance = reconcileLedgerOpeningWithStatement(
    ledgerOpeningBalance,
    statementClosingBalance,
    periodTransactions
  )

  const existing = await indexedDBStorage.getBankReconciliationByPeriod(periodId)
  if (existing) {
    // Heal open sessions when ledger/statement closing was wrong (e.g. Cash Expense $0)
    if (existing.status === 'open') {
      const healed: BankReconciliationSession = {
        ...existing,
        periodStart,
        periodEnd,
        statementId: statementInPeriod?.id ?? existing.statementId,
        bankName: statementInPeriod?.bankName ?? existing.bankName,
        statementOpeningBalance:
          statementOpening ?? existing.statementOpeningBalance ?? ledgerOpeningBalance,
        statementClosingBalance,
        ledgerOpeningBalance,
        updatedAt: new Date().toISOString(),
      }
      healed.difference = computeReconciliationDifference(healed, periodTransactions)
      await indexedDBStorage.saveBankReconciliation(healed)
      return healed
    }

    // Completed empty month frozen at Statement closing $0 (Feb 2026) while prior
    // month close is > $0 — refresh balances, keep completed + cleared ids.
    const completedEmptyStaleZero =
      periodTransactions.length === 0 &&
      Math.abs(existing.statementClosingBalance) < 0.005 &&
      Math.abs(statementClosingBalance) > 0.005

    if (completedEmptyStaleZero) {
      const healed: BankReconciliationSession = {
        ...existing,
        periodStart,
        periodEnd,
        statementId: statementInPeriod?.id ?? existing.statementId,
        bankName: statementInPeriod?.bankName ?? existing.bankName,
        statementOpeningBalance: ledgerOpeningBalance,
        statementClosingBalance,
        ledgerOpeningBalance,
        difference: 0,
        updatedAt: new Date().toISOString(),
      }
      await indexedDBStorage.saveBankReconciliation(healed)
      return healed
    }

    return existing
  }

  const now = new Date().toISOString()
  const session: BankReconciliationSession = {
    id: `recon_${periodId}_${Date.now()}`,
    periodId,
    statementId: statementInPeriod?.id,
    bankName: statementInPeriod?.bankName,
    periodStart,
    periodEnd,
    statementOpeningBalance: statementOpening ?? ledgerOpeningBalance,
    statementClosingBalance,
    ledgerOpeningBalance,
    clearedTransactionIds: [],
    status: 'open',
    difference: roundMoney(statementClosingBalance - ledgerOpeningBalance),
    createdAt: now,
    updatedAt: now,
  }

  await indexedDBStorage.saveBankReconciliation(session)
  return session
}

export async function toggleClearedTransaction(
  sessionId: string,
  transactionKey: string,
  transactions: ReconTransaction[]
): Promise<BankReconciliationSession> {
  const session = await indexedDBStorage.getBankReconciliation(sessionId)
  if (!session) throw new Error('Reconciliation session not found.')
  if (session.status === 'completed') throw new Error('Completed reconciliation cannot be edited.')

  const cleared = new Set(session.clearedTransactionIds)
  if (cleared.has(transactionKey)) {
    cleared.delete(transactionKey)
  } else {
    cleared.add(transactionKey)
  }

  const periodTransactions = filterTransactionsForPeriod(transactions, session.periodId)
  const ledgerOpeningBalance = reconcileLedgerOpeningWithStatement(
    session.ledgerOpeningBalance,
    session.statementClosingBalance,
    periodTransactions
  )

  const updated: BankReconciliationSession = {
    ...session,
    clearedTransactionIds: Array.from(cleared),
    ledgerOpeningBalance,
    statementOpeningBalance: ledgerOpeningBalance,
    updatedAt: new Date().toISOString(),
  }

  updated.difference = computeReconciliationDifference(updated, periodTransactions)

  await indexedDBStorage.saveBankReconciliation(updated)
  return updated
}

/** Clear all / unclear all bank lines for the period (header checkbox). */
export async function setAllClearedTransactions(
  sessionId: string,
  transactions: ReconTransaction[],
  clearAll: boolean
): Promise<BankReconciliationSession> {
  const session = await indexedDBStorage.getBankReconciliation(sessionId)
  if (!session) throw new Error('Reconciliation session not found.')
  if (session.status === 'completed') throw new Error('Completed reconciliation cannot be edited.')

  const periodTransactions = filterTransactionsForPeriod(transactions, session.periodId)
  const keys = clearAll
    ? periodTransactions.map((tx, index) => getTransactionKey(tx, index))
    : []

  const ledgerOpeningBalance = reconcileLedgerOpeningWithStatement(
    session.ledgerOpeningBalance,
    session.statementClosingBalance,
    periodTransactions
  )

  const updated: BankReconciliationSession = {
    ...session,
    clearedTransactionIds: keys,
    ledgerOpeningBalance,
    statementOpeningBalance: ledgerOpeningBalance,
    updatedAt: new Date().toISOString(),
  }
  updated.difference = computeReconciliationDifference(updated, periodTransactions)

  await indexedDBStorage.saveBankReconciliation(updated)
  return updated
}

export async function completeBankReconciliation(
  sessionId: string,
  transactions: ReconTransaction[]
): Promise<BankReconciliationSession> {
  const session = await indexedDBStorage.getBankReconciliation(sessionId)
  if (!session) throw new Error('Reconciliation session not found.')

  const periodTransactions = filterTransactionsForPeriod(transactions, session.periodId)
  const ledgerOpeningBalance = reconcileLedgerOpeningWithStatement(
    session.ledgerOpeningBalance,
    session.statementClosingBalance,
    periodTransactions
  )
  const working: BankReconciliationSession = {
    ...session,
    ledgerOpeningBalance,
    statementOpeningBalance: session.statementOpeningBalance || ledgerOpeningBalance,
  }
  const difference = computeReconciliationDifference(working, periodTransactions)

  const updated: BankReconciliationSession = {
    ...working,
    difference,
    status: Math.abs(difference) < 0.02 ? 'completed' : session.status,
    completedAt: Math.abs(difference) < 0.02 ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  }

  await indexedDBStorage.saveBankReconciliation(updated)
  return updated
}

/**
 * Re-open a completed bank reconciliation so Clear ticks can be edited again
 * (accidental Mark complete — same idea as Period Unlock).
 */
export async function unlockBankReconciliation(
  sessionId: string,
  transactions: ReconTransaction[]
): Promise<BankReconciliationSession> {
  const session = await indexedDBStorage.getBankReconciliation(sessionId)
  if (!session) throw new Error('Reconciliation session not found.')

  if (session.status !== 'completed') {
    return session
  }

  const periodTransactions = filterTransactionsForPeriod(transactions, session.periodId)
  const ledgerOpeningBalance = reconcileLedgerOpeningWithStatement(
    session.ledgerOpeningBalance,
    session.statementClosingBalance,
    periodTransactions
  )

  const updated: BankReconciliationSession = {
    ...session,
    status: 'open',
    completedAt: undefined,
    ledgerOpeningBalance,
    statementOpeningBalance: session.statementOpeningBalance || ledgerOpeningBalance,
    updatedAt: new Date().toISOString(),
  }
  updated.difference = computeReconciliationDifference(updated, periodTransactions)

  await indexedDBStorage.saveBankReconciliation(updated)
  return updated
}

export function getDefaultReconciliationPeriodId(): string {
  return generatePeriodIdFromDateString(new Date().toISOString().split('T')[0])
}
