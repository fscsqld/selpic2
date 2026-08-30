/**
 * Persist payroll bank-clear patches onto statement transactions in IndexedDB.
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  bankTxKey,
  type BankDebitLike,
} from '@/src/features/payroll/bank-pay-run-match'

function keysMatch(a: BankDebitLike, key: string): boolean {
  return bankTxKey(a) === key || (a.id != null && key === `id:${a.id}`)
}

/**
 * Update the first matching bank statement line across all statements.
 * Returns number of statement files updated (0 or 1 typically).
 */
export async function patchBankStatementTransactionByKey(
  bankKey: string,
  updates: Record<string, unknown>
): Promise<boolean> {
  await indexedDBStorage.init()
  const statements = await indexedDBStorage.getAllStatements()

  for (const statement of statements) {
    if (!Array.isArray(statement.transactions)) continue
    let hit = false
    const nextTxs = statement.transactions.map((tx: BankDebitLike) => {
      if (!keysMatch(tx, bankKey)) return tx
      hit = true
      return {
        ...tx,
        ...updates,
        source: tx.source || 'bank',
      }
    })
    if (!hit) continue

    await indexedDBStorage.updateStatement(statement.id, {
      ...statement,
      transactions: nextTxs,
    })
    return true
  }

  return false
}

export async function listBankDebitsFromStatements(): Promise<BankDebitLike[]> {
  await indexedDBStorage.init()
  const statements = await indexedDBStorage.getAllStatements()
  const out: BankDebitLike[] = []
  for (const statement of statements) {
    if (!Array.isArray(statement.transactions)) continue
    for (const tx of statement.transactions) {
      if (tx?.source === 'payroll') continue
      if (tx?.debit && tx.debit > 0) {
        out.push({ ...tx, source: tx.source || 'bank' })
      }
    }
  }
  return out
}
