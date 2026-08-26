/**
 * Deduplicate bank transactions by date + amount + normalised description.
 *
 * Manual Cash Expenses (source=manual / cash_* ids) are never fingerprint-collapsed:
 * two same-day Stamp zone purchases are real costs, not statement re-uploads.
 */

import { normalizeDescription } from '@/lib/storage/user-mappings'

export interface FingerprintableTransaction {
  date: string
  description: string
  debit?: number | null
  credit?: number | null
  category?: string
  confidence?: number | string
  isLearnedMapping?: boolean
  id?: string
  reference?: string
  source?: string
}

function isManualCashExpense(tx: FingerprintableTransaction): boolean {
  if (tx.source === 'manual') return true
  return String(tx.id || '').startsWith('cash_')
}

export function buildTransactionFingerprint(tx: FingerprintableTransaction): string {
  const amount = Math.abs(tx.debit || tx.credit || 0).toFixed(2)
  const desc = normalizeDescription(tx.description || '')
  return `${tx.date}|${amount}|${desc}`
}

function transactionQualityScore(tx: FingerprintableTransaction): number {
  let score = 0
  if (tx.category && tx.category !== 'UNCATEGORIZED') score += 10
  if (tx.isLearnedMapping) score += 25
  if (tx.confidence === 'Manual' || tx.confidence === 'Learned') score += 20
  if (typeof tx.confidence === 'number' && tx.confidence >= 0.9) score += 8
  else if (typeof tx.confidence === 'number' && tx.confidence >= 0.75) score += 4
  if (tx.reference) score += 1
  return score
}

function pickPreferredTransaction<T extends FingerprintableTransaction>(a: T, b: T): T {
  const scoreA = transactionQualityScore(a)
  const scoreB = transactionQualityScore(b)
  if (scoreB > scoreA) return b
  if (scoreA > scoreB) return a
  return (b.reference || b.id) ? b : a
}

/** Remove duplicate bank rows (e.g. same statement uploaded twice or overlapping periods). */
export function dedupeTransactions<T extends FingerprintableTransaction>(transactions: T[]): T[] {
  const bankByFingerprint = new Map<string, T>()
  const cashById = new Map<string, T>()
  const cashWithoutId: T[] = []

  for (const tx of transactions) {
    if (isManualCashExpense(tx)) {
      const id = String(tx.id || '')
      if (id) {
        if (!cashById.has(id)) cashById.set(id, tx)
      } else {
        cashWithoutId.push(tx)
      }
      continue
    }
    const key = buildTransactionFingerprint(tx)
    const existing = bankByFingerprint.get(key)
    bankByFingerprint.set(key, existing ? pickPreferredTransaction(existing, tx) : tx)
  }

  return [
    ...Array.from(bankByFingerprint.values()),
    ...Array.from(cashById.values()),
    ...cashWithoutId,
  ]
}

export function buildStableTransactionId(tx: FingerprintableTransaction): string {
  const fp = buildTransactionFingerprint(tx)
  let hash = 0
  for (let i = 0; i < fp.length; i++) {
    hash = (hash * 31 + fp.charCodeAt(i)) | 0
  }
  return `tx_${Math.abs(hash).toString(36)}`
}
