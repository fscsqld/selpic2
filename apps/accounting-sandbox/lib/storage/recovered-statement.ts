/**
 * "Recover to Statement History" writes a flattened localStorage dump as a new
 * statement (recovered_*.cache). Detect it so Recover cannot run twice beside a
 * real PDF/CSV — the ledger loader must still read every saved statement.
 *
 * Storage is **per browser origin** (e.g. http://localhost:3001 IndexedDB).
 * Another merchant / device / profile never sees this user's History.
 */

export function isRecoveredCacheStatement(statement: {
  bankName?: string
  fileName?: string
}): boolean {
  if (statement.bankName === 'Recovered') return true
  return /^recovered_.*\.cache$/i.test(String(statement.fileName || ''))
}

/** Cash expenses live in their own IndexedDB store and are merged on load. */
export function isCashLikeLedgerRow(tx: { id?: string; source?: string }): boolean {
  return String(tx.id || '').startsWith('cash_')
}

/**
 * Recover must only re-save bank/manual-non-cash rows into a statement.
 * Including cash_* would double every cash expense after loadAllTransactions
 * re-merges the cash store.
 */
export function filterRowsForStatementRecover<T extends { id?: string; source?: string }>(
  txs: T[]
): T[] {
  return txs.filter((tx) => !isCashLikeLedgerRow(tx))
}

export type RecoverEligibilityInput = {
  /** False until first getAllStatements() attempt finishes (success or fail). */
  historyHydrated: boolean
  statements: Array<{
    bankName?: string
    fileName?: string
    transactions?: unknown[]
  }>
  /** Bank-recoverable rows already in memory or localStorage cache (not cash_*). */
  recoverableCacheCount: number
}

export type RecoverEligibility = {
  showBanner: boolean
  allowRecover: boolean
  /** User-facing block when allowRecover is false after hydrate; null if N/A. */
  blockReason: string | null
}

/**
 * Shared rules for History Recover UI + recoverTransactionsFromBrowserCache.
 * Same for every merchant: empty History + cache only; never beside a real file.
 */
export function evaluateRecoverEligibility(
  input: RecoverEligibilityInput
): RecoverEligibility {
  if (!input.historyHydrated) {
    return { showBanner: false, allowRecover: false, blockReason: null }
  }

  const hasRealStatement = input.statements.some(
    (s) => !isRecoveredCacheStatement(s) && (s.transactions?.length || 0) > 0
  )
  if (hasRealStatement) {
    return {
      showBanner: false,
      allowRecover: false,
      blockReason:
        'A bank statement is already in History. Recover would duplicate rows — upload only missing files, or delete the recovered cache row first.',
    }
  }

  if (input.statements.some((s) => isRecoveredCacheStatement(s))) {
    return {
      showBanner: false,
      allowRecover: false,
      blockReason:
        'A recovered cache entry already exists in History. Delete it first if you need to recover again.',
    }
  }

  if (input.recoverableCacheCount <= 0) {
    return { showBanner: false, allowRecover: false, blockReason: null }
  }

  return { showBanner: true, allowRecover: true, blockReason: null }
}
