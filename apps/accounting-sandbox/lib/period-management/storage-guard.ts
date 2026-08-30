/**
 * Enforce period lock rules at the storage write layer.
 */

import { indexedDBStorage } from '../storage/indexed-db'
import {
  generatePeriodIdFromDateString,
  getLockedPeriodIds,
  isDateInLockedPeriod,
} from './period-lock'

export class PeriodLockedError extends Error {
  readonly periodId: string
  readonly recordDate: string

  constructor(recordDate: string, periodId: string) {
    super(
      `Period ${periodId} is locked. Records dated ${recordDate} cannot be created or modified.`
    )
    this.name = 'PeriodLockedError'
    this.periodId = periodId
    this.recordDate = recordDate
  }
}

let cachedLockedIds: Set<string> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5000

export function invalidatePeriodLockCache(): void {
  cachedLockedIds = null
  cacheTimestamp = 0
}

export async function getLockedPeriodIdsCached(): Promise<Set<string>> {
  const now = Date.now()
  if (cachedLockedIds && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLockedIds
  }

  const periods = await indexedDBStorage.getAllPeriods()
  cachedLockedIds = getLockedPeriodIds(periods)
  cacheTimestamp = now
  return cachedLockedIds
}

export async function assertDateNotInLockedPeriod(date: string): Promise<void> {
  if (!date) return

  const lockedIds = await getLockedPeriodIdsCached()
  if (isDateInLockedPeriod(date, lockedIds)) {
    throw new PeriodLockedError(date, generatePeriodIdFromDateString(date))
  }
}

export async function assertDatesNotInLockedPeriod(dates: string[]): Promise<void> {
  for (const date of dates) {
    if (date) {
      await assertDateNotInLockedPeriod(date)
    }
  }
}

export async function assertTransactionsNotInLockedPeriod(
  transactions: Array<{ date?: string }>
): Promise<void> {
  const dates = transactions.map((tx) => tx.date).filter(Boolean) as string[]
  await assertDatesNotInLockedPeriod(dates)
}
