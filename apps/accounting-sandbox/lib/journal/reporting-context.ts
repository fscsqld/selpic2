/**
 * Reporting context — accounting basis, journal entries, and PL exclusion rules.
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { JournalEntry } from '@/src/shared/types/journal-entry'
import type { PaymentAllocation } from '@/src/shared/types/subledger'
import {
  getAccountingSettings,
  type AccountingBasis,
  type AccountingSettings,
} from './accounting-basis'

export interface ReportingContext {
  settings: AccountingSettings
  journalEntries: JournalEntry[]
  /** Bank transaction keys excluded from GL / P&L (accrual AR/AP payments). */
  excludedTransactionIds: Set<string>
  allocations: PaymentAllocation[]
}

export function getActiveJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter(
    (entry) => entry.status === 'posted' || entry.source === 'reversal'
  )
}

/**
 * In accrual mode, bank receipts/payments linked to AR/AP allocations are
 * represented by system journals — exclude the raw bank transaction from reports.
 */
export function buildExcludedTransactionIds(
  allocations: PaymentAllocation[],
  basis: AccountingBasis
): Set<string> {
  const excluded = new Set<string>()
  if (basis !== 'accrual') return excluded

  for (const row of allocations) {
    if (row.transactionId) excluded.add(row.transactionId)
  }
  return excluded
}

export function filterTransactionsForReporting<
  T extends { id?: string; date: string; description: string }
>(transactions: T[], excludedIds: Set<string>): T[] {
  if (excludedIds.size === 0) return transactions

  return transactions.filter((tx, index) => {
    const key = tx.id || `${tx.date}_${index}_${tx.description}`
    return !excludedIds.has(key) && !(tx.id && excludedIds.has(tx.id))
  })
}

export async function loadReportingContext(): Promise<ReportingContext> {
  const [settings, journalEntries, allocations] = await Promise.all([
    getAccountingSettings(),
    indexedDBStorage.getAllJournalEntries(),
    indexedDBStorage.getAllPaymentAllocations(),
  ])

  const excludedTransactionIds = buildExcludedTransactionIds(allocations, settings.basis)

  return {
    settings,
    journalEntries: getActiveJournalEntries(journalEntries),
    excludedTransactionIds,
    allocations,
  }
}
