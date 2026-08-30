import { generatePeriodIdFromDateString } from '@/lib/period-management/period-lock'

export const TRANSACTION_HISTORY_EXPAND_EVENT = 'transactionHistoryExpand'

const LEGACY_TX_CACHE_KEY = 'accounting_transactions'

/** Read the legacy localStorage transaction cache (pre-IndexedDB / recover path). */
export function readLegacyTransactionCache(): unknown[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LEGACY_TX_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Distinct period ids present in a transaction list (sorted ascending). */
export function getDistinctPeriodIdsFromTransactions(
  transactions: Array<{ date?: string | null }>
): string[] {
  const ids = new Set<string>()
  for (const tx of transactions) {
    if (!tx.date) continue
    ids.add(generatePeriodIdFromDateString(tx.date))
  }
  return [...ids].sort()
}

/** Prefer the earliest calendar month that still has transactions. */
export function pickEarliestPeriodWithTransactions(
  transactions: Array<{ date?: string | null }>
): string | null {
  const ids = getDistinctPeriodIdsFromTransactions(transactions)
  return ids[0] ?? null
}

/** Pick the calendar month that contains the most transactions. */
export function pickPeriodWithMostTransactions(
  transactions: Array<{ date: string }>
): string | null {
  if (!transactions.length) return null

  const counts = new Map<string, number>()
  for (const tx of transactions) {
    if (!tx.date) continue
    const periodId = generatePeriodIdFromDateString(tx.date)
    counts.set(periodId, (counts.get(periodId) ?? 0) + 1)
  }

  let bestPeriod: string | null = null
  let bestCount = 0
  for (const [periodId, count] of counts) {
    if (count > bestCount) {
      bestPeriod = periodId
      bestCount = count
    }
  }
  return bestPeriod
}

export function requestTransactionHistoryExpand(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('transactionHistory_expanded', 'true')
  window.dispatchEvent(new CustomEvent(TRANSACTION_HISTORY_EXPAND_EVENT))
}
