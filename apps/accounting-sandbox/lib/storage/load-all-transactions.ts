/**
 * Canonical transaction loader — single source of truth for ledger data.
 */

import { dedupeTransactions } from '@/lib/dashboard/transaction-dedupe'
import { filterBankAdvisoryTransactions, sanitizeBankTransactionDescriptions } from '@/lib/classification/bank-advisory'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { indexedDBStorage } from './indexed-db'

export interface LoadedTransaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
  category?: string
  department?: string
  confidence?: number | string
  reference?: string
  source?: 'bank' | 'manual' | 'payroll' | 'order' | 'journal'
  receiptImageId?: string
  isDirectorsLoan?: boolean
  isPayrollTransaction?: boolean
  requiresPAYG?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  payrollMeta?: {
    payslipId?: string
    grossPay?: number
    withholdingTax?: number
    netPay?: number
    superannuation?: number
  }
  noABNWarning?: {
    shouldWarn?: boolean
    warningMessage?: string
    withholdingAmount?: number
  }
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence?: number
    reasoning?: string
  }
  fbtInfo?: Record<string, unknown>
  [key: string]: unknown
}

export interface LoadAllTransactionsOptions {
  recalculateNoAbnWarnings?: boolean
  /** Write AU date repairs back into IndexedDB statements (default true). */
  persistDateRepairs?: boolean
}

function transactionFingerprint(tx: LoadedTransaction): string {
  if (tx.id) return `id:${tx.id}`
  return `fp:${tx.date}|${tx.description}|${tx.debit ?? ''}|${tx.credit ?? ''}|${tx.balance ?? ''}`
}

/**
 * After global date repair, push corrected ISO dates into each stored statement.
 */
export async function persistRepairedDatesToStatements(
  before: LoadedTransaction[],
  after: LoadedTransaction[]
): Promise<number> {
  const repairedDates = new Map<string, string>()
  for (let i = 0; i < before.length; i++) {
    const prev = before[i]
    const next = after[i]
    if (!next || prev.date === next.date) continue
    repairedDates.set(transactionFingerprint(prev), next.date)
  }
  if (repairedDates.size === 0) return 0

  const storedStatements = await indexedDBStorage.getAllStatements()
  const { toLoad } = statementsForLedgerLoad(storedStatements)
  const statements = toLoad
  let updatedStatements = 0

  for (const statement of statements) {
    if (!statement.transactions?.length) continue
    let changed = false
    const transactions = statement.transactions.map((tx) => {
      const key = transactionFingerprint(tx as LoadedTransaction)
      const newDate = repairedDates.get(key)
      if (newDate && tx.date !== newDate) {
        changed = true
        return { ...tx, date: newDate }
      }
      return tx
    })
    if (changed) {
      await indexedDBStorage.updateStatement(statement.id, { ...statement, transactions })
      updatedStatements++
    }
  }

  if (updatedStatements > 0) {
    console.log(
      `[loadAllTransactions] Persisted AU date repairs to ${updatedStatements} statement(s)`
    )
  }
  return updatedStatements
}

export async function loadAllTransactions(
  options: LoadAllTransactionsOptions = {}
): Promise<LoadedTransaction[]> {
  const { recalculateNoAbnWarnings = true, persistDateRepairs = false } = options

  await indexedDBStorage.init()

  const allTransactions: LoadedTransaction[] = []

  const statements = await indexedDBStorage.getAllStatements()
  for (const statement of statements) {
    if (statement.transactions && Array.isArray(statement.transactions)) {
      for (const tx of statement.transactions) {
        // Skip payroll journals wrongly embedded in bank statement history
        if (tx.source === 'payroll' || tx.isPayrollTransaction) continue
        allTransactions.push({
          ...tx,
          source: tx.source || 'bank',
        })
      }
    }
  }

  // Fix OCR/absurd years then US↔AU month phantoms before period scoping
  const anomalyRepaired = repairStatementDateAnomalies(allTransactions)
  const dateRepaired = repairUsMisparsedAustralianDates(anomalyRepaired)
  if (persistDateRepairs && dateRepaired.some((tx, i) => tx.date !== allTransactions[i]?.date)) {
    await persistRepairedDatesToStatements(allTransactions, dateRepaired)
    // Re-read bank rows so in-memory list matches IndexedDB
    allTransactions.length = 0
    const refreshed = await indexedDBStorage.getAllStatements()
    for (const statement of refreshed) {
      if (statement.transactions && Array.isArray(statement.transactions)) {
        for (const tx of statement.transactions) {
          if (tx.source === 'payroll' || tx.isPayrollTransaction) continue
          allTransactions.push({
            ...tx,
            source: tx.source || 'bank',
          })
        }
      }
    }
  } else if (dateRepaired !== allTransactions) {
    allTransactions.length = 0
    allTransactions.push(...dateRepaired)
  }

  try {
    const cashExpenses = await indexedDBStorage.getAllCashExpenses()
    for (const expense of cashExpenses) {
      allTransactions.push({
        id: expense.id,
        date: expense.date,
        description: expense.merchant || expense.description || 'Cash Expense',
        debit: expense.amount,
        credit: 0,
        balance: 0,
        category: expense.category || 'CASH_EXPENSE_PETTY',
        confidence: 'Manual',
        department: expense.department || 'cleaning',
        source: 'manual',
        receiptImageId: expense.receiptImageId,
        gstInfo: expense.gstInfo,
      })
    }
  } catch (error) {
    console.warn('[loadAllTransactions] Failed to load cash expenses:', error)
  }

  try {
    // Drop leftover payroll journals when HR payslips were deleted earlier
    await indexedDBStorage.purgeOrphanPayrollTransactions()
  } catch (error) {
    console.warn('[loadAllTransactions] Failed to purge orphan payroll journals:', error)
  }

  try {
    const standaloneTransactions = await indexedDBStorage.getAllTransactions()
    const payrollTransactions = standaloneTransactions.filter(
      (tx: LoadedTransaction) => tx.isPayrollTransaction && tx.source === 'payroll'
    )
    allTransactions.push(...payrollTransactions)
  } catch (error) {
    console.warn('[loadAllTransactions] Failed to load payroll transactions:', error)
  }

  if (!recalculateNoAbnWarnings) {
    return dedupeTransactions(
      sanitizeBankTransactionDescriptions(filterBankAdvisoryTransactions(allTransactions))
    )
  }

  try {
    const { recalculateNoABNWarningsForTransactions } = await import(
      '@/lib/utils/no-abn-warning-recalculator'
    )
    const recalculated = await recalculateNoABNWarningsForTransactions(allTransactions as any[])
    return dedupeTransactions(
      sanitizeBankTransactionDescriptions(filterBankAdvisoryTransactions(recalculated))
    )
  } catch (error) {
    console.warn('[loadAllTransactions] Failed to recalculate No ABN warnings:', error)
    return dedupeTransactions(
      sanitizeBankTransactionDescriptions(filterBankAdvisoryTransactions(allTransactions))
    )
  }
}

/**
 * Canonical transactions filtered for reporting (accrual AR/AP exclusions).
 */
export async function loadReportingTransactions(
  options: LoadAllTransactionsOptions = {}
): Promise<{
  transactions: LoadedTransaction[]
  excludedTransactionIds: Set<string>
  journalEntries: import('@/src/shared/types/journal-entry').JournalEntry[]
  accountingBasis: 'cash' | 'accrual'
}> {
  const { loadReportingContext } = await import('@/lib/journal/reporting-context')
  const [transactions, context] = await Promise.all([
    loadAllTransactions(options),
    loadReportingContext(),
  ])

  const { filterTransactionsForReporting } = await import('@/lib/journal/reporting-context')

  return {
    transactions: filterTransactionsForReporting(transactions, context.excludedTransactionIds),
    excludedTransactionIds: context.excludedTransactionIds,
    journalEntries: context.journalEntries,
    accountingBasis: context.settings.basis,
  }
}

/**
 * Sync legacy localStorage cache from canonical IndexedDB data.
 */
export function syncLegacyTransactionCache(transactions: LoadedTransaction[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('accounting_transactions', JSON.stringify(transactions))
  } catch (error) {
    console.warn('[loadAllTransactions] Failed to sync legacy transaction cache:', error)
  }
}
