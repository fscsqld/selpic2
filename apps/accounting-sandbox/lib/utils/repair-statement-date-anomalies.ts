/**
 * Repair absurd / OCR-corrupted ledger dates.
 *
 * - Impossible years (e.g. 2067 from OCR "267") → dominant statement year
 * - Known OCR slip: "Jason Selpic" dated prior calendar year while the statement
 *   is dominated by the next year (18/05/2025 on a 2026 Apr–Jun PDF) → dominant year
 * - After year repair, collapse soft duplicates (same amount+description, year-off-by-1)
 *   so an old OCR row does not double-count alongside a Manual-corrected date
 *
 * Other plausible prior-year rows are left alone unless they match that pattern.
 */

import { normalizeDescription } from '@/lib/storage/user-mappings'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'

type Dated = {
  date?: string
  description?: string
  confidence?: number | string
  debit?: number | null
  credit?: number | null
  id?: string
  source?: string
}

/**
 * Add Cash Expense rows are legitimate same-day / same-merchant duplicates
 * (e.g. two Stamp zone purchases). OCR collapse must never drop them —
 * that understated ATO Annual / CTR expenses vs Biz Intel FY.
 */
function isManualCashExpenseRow(tx: Dated): boolean {
  if (tx.source === 'manual') return true
  return String(tx.id || '').startsWith('cash_')
}

function parseParts(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function dominantCalendarYear(transactions: Dated[]): number | null {
  const counts = new Map<number, number>()
  for (const tx of transactions) {
    const iso = toIsoDateString(tx.date)
    if (!iso) continue
    const p = parseParts(iso)
    if (!p || p.y >= 2035) continue
    counts.set(p.y, (counts.get(p.y) || 0) + 1)
  }
  let best: number | null = null
  let bestN = 0
  for (const [y, n] of counts) {
    if (n > bestN) {
      best = y
      bestN = n
    }
  }
  return bestN >= 3 ? best : null
}

/** Map OCR/future years like 2067 → dominant year (usually 2026). */
function repairAbsurdYear(iso: string, dominantYear: number | null): string | null {
  const p = parseParts(iso)
  if (!p) return null
  if (p.y < 2035 || p.y > 2099) return null
  const year =
    dominantYear ??
    Number(`202${String(p.y).charAt(2)}`)
  if (year < 2015 || year > 2035) return null
  return `${year}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

function isJasonSelpic(description?: string): boolean {
  const d = String(description || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
  return d.includes('JASON SELPIC')
}

/**
 * Jason Selpic credit on a 2026-dominated statement wrongly stored as 2025-05-18.
 * Manual correction to 2026-05-18 is the correct date — pull OCR prior-year forward.
 */
function repairJasonSelpicPriorYear(
  iso: string,
  description: string | undefined,
  dominantYear: number | null
): string | null {
  if (!dominantYear || !isJasonSelpic(description)) return null
  const p = parseParts(iso)
  if (!p) return null
  if (p.y === dominantYear) return null
  // Only pull forward by exactly one calendar year (2025 → 2026)
  if (p.y !== dominantYear - 1) return null
  return `${dominantYear}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

function softAmountDescKey(tx: Dated): string {
  const raw =
    tx.debit ??
    tx.credit ??
    (tx as { amount?: number | null }).amount ??
    0
  const amount = Math.abs(Number(raw) || 0).toFixed(2)
  const desc = normalizeDescription(tx.description || '')
  return `${amount}|${desc}`
}

function qualityScore(tx: Dated): number {
  let score = 0
  if (tx.confidence === 'Manual' || tx.confidence === 'Learned') score += 20
  if (typeof tx.confidence === 'number' && tx.confidence >= 0.9) score += 8
  if (tx.id) score += 1
  const iso = toIsoDateString(tx.date)
  if (iso) score += Number(iso.slice(0, 4)) // prefer corrected/later year when tied
  return score
}

/**
 * After OCR year repair, drop a leftover prior-year clone of the same row
 * (e.g. Jason @ 2025-05-18 still in History while Manual @ 2026-05-18 is correct).
 * Also collapses when both already share the corrected date.
 */
function collapseOcrYearSlipDuplicates<T extends Dated>(transactions: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const tx of transactions) {
    // Cash expenses never participate in OCR/Manual bank collapse.
    if (isManualCashExpenseRow(tx)) continue
    const key = softAmountDescKey(tx)
    const list = groups.get(key) || []
    list.push(tx)
    groups.set(key, list)
  }

  const drop = new Set<T>()
  for (const list of groups.values()) {
    if (list.length < 2) continue

    const withIso = list
      .map((tx) => ({ tx, iso: toIsoDateString(tx.date) }))
      .filter((x): x is { tx: T; iso: string } => !!x.iso)

    const isJasonGroup = withIso.some((x) => isJasonSelpic(x.tx.description))
    const hasManual = withIso.some(
      (x) => x.tx.confidence === 'Manual' || x.tx.confidence === 'Learned'
    )
    if (!isJasonGroup && !hasManual) continue

    // Same corrected date → keep highest quality only
    const byDate = new Map<string, T[]>()
    for (const { tx, iso } of withIso) {
      const arr = byDate.get(iso) || []
      arr.push(tx)
      byDate.set(iso, arr)
    }
    for (const sameDate of byDate.values()) {
      if (sameDate.length < 2) continue
      const ranked = [...sameDate].sort((a, b) => qualityScore(b) - qualityScore(a))
      for (const extra of ranked.slice(1)) drop.add(extra)
    }

    // Year-off-by-1, same month/day (OCR slip vs Manual before forward repair)
    for (let i = 0; i < withIso.length; i++) {
      for (let j = i + 1; j < withIso.length; j++) {
        if (drop.has(withIso[i].tx) || drop.has(withIso[j].tx)) continue
        const a = parseParts(withIso[i].iso)
        const b = parseParts(withIso[j].iso)
        if (!a || !b) continue
        if (a.m !== b.m || a.d !== b.d) continue
        if (Math.abs(a.y - b.y) !== 1) continue
        const prefer =
          qualityScore(withIso[i].tx) >= qualityScore(withIso[j].tx)
            ? withIso[i].tx
            : withIso[j].tx
        const other = prefer === withIso[i].tx ? withIso[j].tx : withIso[i].tx
        drop.add(other)
      }
    }
  }

  if (drop.size === 0) return transactions
  return transactions.filter((tx) => !drop.has(tx))
}

/**
 * Apply OCR year repairs. Also fixes known Jason Selpic prior-year OCR slip,
 * then collapses leftover OCR/Manual year clones so totals are not doubled.
 */
export function repairStatementDateAnomalies<T extends Dated>(transactions: T[]): T[] {
  if (!transactions.length) return transactions

  const dominantYear = dominantCalendarYear(transactions)

  const repaired = transactions.map((tx) => {
    const iso = toIsoDateString(tx.date)
    if (!iso) return tx

    const absurd = repairAbsurdYear(iso, dominantYear)
    if (absurd) return { ...tx, date: absurd }

    const jason = repairJasonSelpicPriorYear(iso, tx.description, dominantYear)
    if (jason) return { ...tx, date: jason }

    if (iso !== tx.date) return { ...tx, date: iso }
    return tx
  })

  return collapseOcrYearSlipDuplicates(repaired)
}
