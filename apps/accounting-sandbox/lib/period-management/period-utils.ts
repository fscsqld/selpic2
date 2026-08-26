/**
 * Period Management Utilities
 *
 * Calendar helpers are timezone-safe (never use Date#toISOString for YYYY-MM-DD
 * month bounds — that shifts AU local midnight back one calendar day).
 */

import { FinancialPeriod } from '../storage/period-types'
import { indexedDBStorage } from '../storage/indexed-db'
import { calculateBusinessMetrics } from '../utils/business-calculations'
import { isManualCashExpenseTx } from '@/lib/dashboard/view-period-range'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Reasonable Australian FY window for monthly period records. */
export function isValidPeriodId(id: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(String(id || '').trim())
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12
}

/**
 * Local-calendar YYYY-MM-DD bounds for a period id (no UTC shift).
 */
export function periodIdToCalendarBounds(
  id: string
): { startDate: string; endDate: string } | null {
  if (!isValidPeriodId(id)) return null
  const [year, month] = id.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

/** Format a Date using local Y/M/D — never toISOString(). */
export function formatCalendarDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Overwrite start/end from the period id so UTC-shifted rows self-heal. */
export function healPeriodCalendarDates(period: FinancialPeriod): FinancialPeriod {
  const bounds = periodIdToCalendarBounds(period.id)
  if (!bounds) return period
  if (period.startDate === bounds.startDate && period.endDate === bounds.endDate) {
    return period
  }
  return { ...period, startDate: bounds.startDate, endDate: bounds.endDate }
}

export function previousPeriodId(periodId: string): string | null {
  if (!isValidPeriodId(periodId)) return null
  const [year, month] = periodId.split('-').map(Number)
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

export function nextPeriodId(periodId: string): string | null {
  if (!isValidPeriodId(periodId)) return null
  const [year, month] = periodId.split('-').map(Number)
  if (month === 12) return `${year + 1}-01`
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function resolveChainedOpenings(
  priorClosing: { directorLoan: number; cash: number } | null,
  settingsOpeningDirectorLoan: number,
  settingsOpeningCash: number
): { openingDirectorLoan: number; openingCash: number } {
  if (priorClosing) {
    return {
      openingDirectorLoan: priorClosing.directorLoan,
      openingCash: priorClosing.cash,
    }
  }
  return {
    openingDirectorLoan: settingsOpeningDirectorLoan,
    openingCash: settingsOpeningCash,
  }
}

function toAustralianDisplay(isoYmd: string): string {
  const [y, m, d] = isoYmd.split('-')
  if (!y || !m || !d) return isoYmd
  return `${d}/${m}/${y}`
}

export function formatPeriodSelectLabel(
  periodId: string,
  opts: { isLocked: boolean; compact?: boolean } = { isLocked: false }
): string {
  if (!isValidPeriodId(periodId)) return periodId
  const [, monthStr] = periodId.split('-')
  const monthName = MONTH_NAMES[Number(monthStr) - 1] || monthStr
  const year = periodId.slice(0, 4)
  const status = opts.isLocked ? 'Locked' : 'Active'
  if (opts.compact) {
    return `${monthName} ${year} · ${status}`
  }
  const bounds = periodIdToCalendarBounds(periodId)!
  return `${monthName} ${year} (${toAustralianDisplay(bounds.startDate)} – ${toAustralianDisplay(bounds.endDate)}) · ${status}`
}

/**
 * Generate period ID from date (format: YYYY-MM).
 * Rejects absurd years so OCR junk cannot mint 257-10 style ids.
 */
export function generatePeriodId(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return generatePeriodId(new Date())
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const id = `${year}-${month}`
  if (!isValidPeriodId(id)) {
    return generatePeriodId(new Date())
  }
  return id
}

/**
 * Get period start and end dates for a given month (local Date objects).
 */
export function getPeriodDates(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Last day of month
  return { startDate, endDate }
}

/**
 * Get current period dates
 */
export function getCurrentPeriodDates(): { startDate: Date; endDate: Date; periodId: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { startDate, endDate } = getPeriodDates(year, month)
  const periodId = generatePeriodId(now)
  return { startDate, endDate, periodId }
}

/**
 * Calculate closing balances for a period
 * @param priorPeriodDirectorAdvances — manual prior for this month only (never auto-match lump)
 */
export function calculatePeriodClosingBalances(
  transactions: any[],
  openingDirectorLoanBalance: number,
  openingCashBalance: number,
  priorPeriodDirectorAdvances: number = 0
): {
  closingDirectorLoanBalance: number
  closingCashBalance: number
  accountsReceivable: number
} {
  const metrics = calculateBusinessMetrics(
    transactions,
    openingDirectorLoanBalance,
    'company',
    priorPeriodDirectorAdvances
  )

  // Cash book = bank movement only. Director-funded Cash Expense never left the bank.
  const bankTxs = transactions.filter((tx) => !isManualCashExpenseTx(tx))

  const totalCredits = bankTxs
    .filter(
      (tx) =>
        tx.credit &&
        tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
        tx.category !== 'NON_TAXABLE_TRANSFER'
    )
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  const totalDebits = bankTxs
    .filter((tx) => tx.debit && tx.category !== 'NON_TAXABLE_TRANSFER')
    .reduce((sum, tx) => sum + Math.abs(tx.debit || 0), 0)

  const closingCashBalance = openingCashBalance + totalCredits - totalDebits

  const accountsReceivable = transactions
    .filter(
      (tx) =>
        tx.credit &&
        ((tx.category === 'INCOME_TRADING' || tx.category === 'INCOME_SERVICE') &&
          (tx.description?.toUpperCase().includes('OUTSTANDING') ||
            tx.description?.toUpperCase().includes('PENDING')))
    )
    .reduce((sum, tx) => sum + Math.abs(tx.credit || 0), 0)

  return {
    closingDirectorLoanBalance: metrics.directorsLoanBalance,
    closingCashBalance,
    accountsReceivable,
  }
}

/**
 * Create or update period with calculated balances
 */
export async function createOrUpdatePeriod(
  periodId: string,
  transactions: any[],
  openingDirectorLoanBalance: number = 0,
  openingCashBalance: number = 0
): Promise<FinancialPeriod> {
  if (!isValidPeriodId(periodId)) {
    throw new Error(`Invalid period id "${periodId}" (expected YYYY-MM in 2000–2100)`)
  }

  const bounds = periodIdToCalendarBounds(periodId)!

  const closingBalances = calculatePeriodClosingBalances(
    transactions,
    openingDirectorLoanBalance,
    openingCashBalance
  )

  const existingPeriod = await indexedDBStorage.getPeriod(periodId)

  if (existingPeriod && existingPeriod.isLocked) {
    throw new Error(`Period ${periodId} is locked and cannot be updated`)
  }

  const period: FinancialPeriod = existingPeriod || {
    id: periodId,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    periodType: 'Monthly',
    openingDirectorLoanBalance,
    closingDirectorLoanBalance: closingBalances.closingDirectorLoanBalance,
    openingCashBalance,
    closingCashBalance: closingBalances.closingCashBalance,
    isLocked: false,
    accountsReceivable: closingBalances.accountsReceivable,
    carriedForwardReceivables: existingPeriod?.carriedForwardReceivables || [],
    createdAt: existingPeriod?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  period.startDate = bounds.startDate
  period.endDate = bounds.endDate
  // Unlocked months always take live openings — stale Settings $1,000 must not stick.
  period.openingDirectorLoanBalance = openingDirectorLoanBalance
  period.openingCashBalance = openingCashBalance
  period.closingDirectorLoanBalance = closingBalances.closingDirectorLoanBalance
  period.closingCashBalance = closingBalances.closingCashBalance
  period.accountsReceivable = closingBalances.accountsReceivable
  period.updatedAt = new Date().toISOString()

  await indexedDBStorage.savePeriod(period)
  return period
}

/**
 * Close period and carry forward to next period
 */
export async function closePeriodAndCarryForward(
  periodId: string,
  lockedBy: string = 'owner'
): Promise<{ nextPeriod: FinancialPeriod }> {
  if (!isValidPeriodId(periodId)) {
    throw new Error(`Invalid period id "${periodId}"`)
  }

  await indexedDBStorage.lockPeriod(periodId, lockedBy)

  const currentPeriod = await indexedDBStorage.getPeriod(periodId)
  if (!currentPeriod) {
    throw new Error(`Period ${periodId} not found`)
  }

  const nextId = nextPeriodId(periodId)
  if (!nextId) {
    throw new Error(`Could not compute next period after ${periodId}`)
  }

  await indexedDBStorage.carryForwardPeriod(periodId, nextId, lockedBy)

  const nextPeriod = await indexedDBStorage.getPeriod(nextId)
  if (!nextPeriod) {
    throw new Error(`Failed to create next period ${nextId}`)
  }

  return { nextPeriod }
}

/**
 * Get receivables to carry forward (미수금 이월)
 */
export function getReceivablesToCarryForward(
  transactions: any[],
  _periodId: string
): string[] {
  return transactions
    .filter(
      (tx) =>
        tx.credit &&
        (tx.category === 'INCOME_TRADING' || tx.category === 'INCOME_SERVICE') &&
        (tx.description?.toUpperCase().includes('OUTSTANDING') ||
          tx.description?.toUpperCase().includes('PENDING') ||
          tx.description?.toUpperCase().includes('UNPAID'))
    )
    .map((tx) => tx.id || `${tx.date}_${tx.description}`)
}

export {
  computePeriodDirectorLoanChain,
  firstDirectorLoanPeriodId,
  formatDirectorLoanCaption,
  summarizePeriodActivity,
} from './period-director-loan-chain'
