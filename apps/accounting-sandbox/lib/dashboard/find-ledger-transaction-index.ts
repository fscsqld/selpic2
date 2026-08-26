/**
 * Resolve a Transaction History row id back into the full ledger array.
 *
 * History often filters by P&L period, so the `_index` suffix is the filtered
 * row index — not the index in `transactions`. Matching only `${id}_${idx}`
 * then fails and date/category edits never persist.
 */

export type LedgerRowRef = {
  id?: string
  date?: string
  description?: string
  debit?: number | null
  credit?: number | null
}

function compoundIds(tx: LedgerRowRef, idx: number): string[] {
  const date = String(tx.date || '')
  const desc = String(tx.description || '')
  const ids: string[] = []
  if (tx.id != null && tx.id !== '') {
    ids.push(String(tx.id))
    ids.push(`${tx.id}_${idx}`)
  }
  ids.push(`${date}_${desc}`)
  ids.push(`${date}_${desc}_${idx}`)
  return ids
}

function amountKey(tx: LedgerRowRef): string {
  return Math.abs(Number(tx.debit || tx.credit || 0)).toFixed(2)
}

/**
 * Find the ledger index for a History/table row id (may include a view index suffix).
 */
export function findLedgerTransactionIndex<T extends LedgerRowRef>(
  transactions: T[],
  id: string
): number {
  if (!id || !transactions.length) return -1

  const exact = transactions.findIndex((tx, idx) => compoundIds(tx, idx).includes(id))
  if (exact >= 0) return exact

  // `${stableId}_${viewIndex}` — viewIndex is from a filtered table, ignore it
  const lastUnderscore = id.lastIndexOf('_')
  if (lastUnderscore > 0) {
    const maybeStable = id.slice(0, lastUnderscore)
    const suffix = id.slice(lastUnderscore + 1)
    if (/^\d+$/.test(suffix) && maybeStable) {
      const byStable = transactions.findIndex(
        (tx) => tx.id != null && String(tx.id) === maybeStable
      )
      if (byStable >= 0) return byStable

      // No stable id: `${date}_${description}_${viewIndex}`
      const dateDesc = maybeStable
      const byDateDesc = transactions.findIndex((tx, idx) => {
        const key = `${tx.date}_${tx.description}`
        return key === dateDesc || compoundIds(tx, idx).includes(dateDesc)
      })
      if (byDateDesc >= 0) return byDateDesc
    }
  }

  return -1
}

/** Soft fallback: unique amount + description (survives date edits). */
export function findLedgerTransactionIndexByAmountDescription<T extends LedgerRowRef>(
  transactions: T[],
  tip: LedgerRowRef
): number {
  const amount = amountKey(tip)
  const desc = String(tip.description || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (!desc) return -1
  const matches = transactions
    .map((tx, idx) => ({ tx, idx }))
    .filter(({ tx }) => {
      const d = String(tx.description || '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()
      return d === desc && amountKey(tx) === amount
    })
  return matches.length === 1 ? matches[0].idx : -1
}
