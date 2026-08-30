import { describe, expect, it } from 'vitest'
import { dedupeTransactions } from '@/lib/dashboard/transaction-dedupe'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'

/**
 * Mirrors the per-statement pipeline in loadAllTransactions, so a regression that
 * drops Apr–Jun bank rows is caught without a browser.
 */
function loadStatementRows<T extends { date: string; description: string }>(rows: T[]): T[] {
  return repairUsMisparsedAustralianDates(repairStatementDateAnomalies(rows))
}

function bankRow(date: string, n: number) {
  return {
    id: `${date}_${n}`,
    date,
    description: `MERCHANT ${n}`,
    debit: 10 + n,
    credit: null,
    source: 'bank',
  }
}

/** Apr–Jun statement: 15 April, 14 May, 21 June = 50 rows. */
function aprJunStatement() {
  const rows: ReturnType<typeof bankRow>[] = []
  for (let i = 1; i <= 15; i++) rows.push(bankRow(`2026-04-${String(i).padStart(2, '0')}`, i))
  for (let i = 1; i <= 14; i++) rows.push(bankRow(`2026-05-${String(i).padStart(2, '0')}`, 100 + i))
  for (let i = 1; i <= 21; i++) rows.push(bankRow(`2026-06-${String(i).padStart(2, '0')}`, 200 + i))
  return rows
}

const isAprJun = (row: { date: string }) => {
  const month = Number(row.date.slice(5, 7))
  return row.date.startsWith('2026') && month >= 4 && month <= 6
}

describe('statement load pipeline', () => {
  it('keeps all 50 Apr–Jun rows of a Q4-only statement', () => {
    const statement = aprJunStatement()
    expect(statement).toHaveLength(50)

    const loaded = loadStatementRows(statement)
    expect(loaded).toHaveLength(50)
    expect(loaded.filter(isAprJun)).toHaveLength(50)
  })

  it('keeps Q3 bank rows in Jan–Mar when the statement is Q3-only', () => {
    const q3 = [
      bankRow('2026-01-15', 1),
      bankRow('2026-03-02', 2),
      bankRow('2026-03-19', 3),
      bankRow('2026-03-26', 4),
      bankRow('2026-03-30', 5),
    ]
    const loaded = loadStatementRows(q3)
    expect(loaded).toHaveLength(5)
    expect(loaded.every((row) => row.date.startsWith('2026-01') || row.date.startsWith('2026-03'))).toBe(
      true
    )
  })

  it('merging an overlapping recovered dump does not lose Apr–Jun rows', () => {
    const clean = loadStatementRows(aprJunStatement())
    // Same rows saved again by "Recover to Statement History", plus one extra June row
    const dump = loadStatementRows([...aprJunStatement(), bankRow('2026-06-29', 999)])

    const merged = dedupeTransactions([...clean, ...dump])
    expect(merged.filter(isAprJun)).toHaveLength(51)
  })
})
