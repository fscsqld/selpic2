/**
 * Repair bank dates that were stored after US MM/DD parsing of Australian DD/MM.
 *
 * Typical Apr–Jun NAB statement phantoms in BAS Q3 (Jan–Mar):
 *   AU 01/04/2026 → US Jan 4  → ISO 2026-01-04
 *   AU 01/05/2026 → US Jan 5  → ISO 2026-01-05
 *   AU 01/06/2026 → US Jan 6  → ISO 2026-01-06
 *   AU 03/06/2026 → US Mar 6  → ISO 2026-03-06
 *
 * When the ledger has a real Apr–Jun bank file, swap only Jan–Mar ISO rows
 * whose day/month pair lands in Apr–Jun. Unswappable January dates (e.g. 14 Jan)
 * stay in Q3. Cash rows and genuine Q3 bank must not block that phantom repair
 * (otherwise Q3 P&L shows ~32 txs instead of 13).
 */

import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

type Dated = {
  date?: string
  source?: string
  id?: string
  isPayrollTransaction?: boolean
}

function isCashOrNonBankRow(tx: Dated): boolean {
  if (tx.source === 'manual' || tx.source === 'payroll' || tx.source === 'journal') {
    return true
  }
  if (tx.isPayrollTransaction) return true
  return String(tx.id || '').startsWith('cash_')
}

export interface DateRepairStats {
  aprJunCount: number
  janMarCount: number
  repairedCount: number
  dominantMonths: number[]
}

function parseParts(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function swapMd(iso: string): string | null {
  const p = parseParts(iso)
  if (!p) return null
  if (p.d < 1 || p.d > 12 || p.m < 1 || p.m > 12) return null
  if (p.d === p.m) return null
  return `${p.y}-${String(p.d).padStart(2, '0')}-${String(p.m).padStart(2, '0')}`
}

/** When month === day (1/1, 2/2, 3/3 US mis-parse), shift to Apr/May/Jun same day. */
function shiftJanMarSameMd(iso: string): string | null {
  const p = parseParts(iso)
  if (!p || p.m < 1 || p.m > 3 || p.d !== p.m) return null
  const newMonth = p.m + 3
  return `${p.y}-${String(newMonth).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

function countByMonth(transactions: Dated[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const tx of transactions) {
    if (isCashOrNonBankRow(tx)) continue
    const iso = toIsoDateString(tx.date)
    if (!iso) continue
    const p = parseParts(iso)
    if (!p) continue
    counts.set(p.m, (counts.get(p.m) || 0) + 1)
  }
  return counts
}

function sumMonths(counts: Map<number, number>, months: number[]): number {
  return months.reduce((s, m) => s + (counts.get(m) || 0), 0)
}

/**
 * Apr–Jun-only bank upload: many rows in months 4–6, small Jan–Mar tail from US parse.
 */
export function isAprJunDominatedWithJanMarPhantoms(transactions: Dated[]): {
  repair: boolean
  targetMonths: Set<number>
  aprJunCount: number
  janMarCount: number
} {
  const counts = countByMonth(transactions)
  const aprJunCount = sumMonths(counts, [4, 5, 6])
  const janMarCount = sumMonths(counts, [1, 2, 3])
  const total = [...counts.values()].reduce((a, b) => a + b, 0)

  if (total === 0 || aprJunCount === 0) {
    return { repair: false, targetMonths: new Set(), aprJunCount, janMarCount }
  }

  // Bank-only. Cash in Jan–Mar must not block phantom repair (that left ~19 Q4
  // US dates in Q3 and showed 32 txs instead of 13). Genuine Q3 (day > 12)
  // is not swapped by repairOneDate — do not require janMar ≤ 15.
  const repair = aprJunCount >= 10 && janMarCount > 0

  return {
    repair,
    targetMonths: repair ? new Set([4, 5, 6]) : new Set(),
    aprJunCount,
    janMarCount,
  }
}

/**
 * True when Jan–Mar bank dates cannot be a US MM/DD phantom (e.g. 14 Jan).
 * A real Q3 statement mixed into Q4 History must not be folded into Apr–Jun.
 */
export function hasGenuineQ3BankDates(transactions: Dated[]): boolean {
  const targetMonths = new Set([4, 5, 6])
  for (const tx of transactions) {
    if (isCashOrNonBankRow(tx)) continue
    const iso = toIsoDateString(tx.date)
    if (!iso) continue
    const p = parseParts(iso)
    if (!p || p.m < 1 || p.m > 3) continue
    if (!repairOneDate(iso, targetMonths)) return true
  }
  return false
}

function repairOneDate(iso: string, targetMonths: Set<number>): string | null {
  const p = parseParts(iso)
  if (!p || targetMonths.has(p.m)) return null
  if (p.m < 1 || p.m > 3) return null

  if (p.d >= 1 && p.d <= 12) {
    const swapped = swapMd(iso)
    if (swapped) {
      const sp = parseParts(swapped)
      if (sp && targetMonths.has(sp.m)) return swapped
    }
    const shifted = shiftJanMarSameMd(iso)
    if (shifted) {
      const sp = parseParts(shifted)
      if (sp && targetMonths.has(sp.m)) return shifted
    }
  }

  return null
}

export function repairUsMisparsedAustralianDates<T extends Dated>(
  transactions: T[]
): T[] {
  const { repair } = isAprJunDominatedWithJanMarPhantoms(transactions)
  if (!repair) return transactions
  const targetMonths = new Set([4, 5, 6])

  return transactions.map((tx) => {
    if (isCashOrNonBankRow(tx)) return tx
    const iso = toIsoDateString(tx.date)
    if (!iso) return tx
    const fixed = repairOneDate(iso, targetMonths)
    return fixed ? { ...tx, date: fixed } : tx
  })
}

export function repairUsMisparsedAustralianDatesWithStats<T extends Dated>(
  transactions: T[]
): { transactions: T[]; stats: DateRepairStats } {
  const { repair, aprJunCount, janMarCount } =
    isAprJunDominatedWithJanMarPhantoms(transactions)

  if (!repair) {
    return {
      transactions,
      stats: {
        aprJunCount,
        janMarCount,
        repairedCount: 0,
        dominantMonths: [4, 5, 6],
      },
    }
  }

  const targetMonths = new Set([4, 5, 6])
  let repairedCount = 0
  const out = transactions.map((tx) => {
    if (isCashOrNonBankRow(tx)) return tx
    const iso = toIsoDateString(tx.date)
    if (!iso) return tx
    const fixed = repairOneDate(iso, targetMonths)
    if (fixed && fixed !== iso) {
      repairedCount++
      return { ...tx, date: fixed }
    }
    return tx
  })

  return {
    transactions: out,
    stats: {
      aprJunCount,
      janMarCount,
      repairedCount,
      dominantMonths: [4, 5, 6],
    },
  }
}
