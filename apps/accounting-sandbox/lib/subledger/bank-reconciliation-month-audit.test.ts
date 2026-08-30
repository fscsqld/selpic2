/**
 * Selpic Jan–Jun 2026 — bank recon row counts vs canonical parse fixtures.
 * Bank Reconciliation uses filterTransactionsForPeriod (tx.date month, no cash_*).
 */
import { describe, expect, it } from 'vitest'
import { filterTransactionsForPeriod } from '@/lib/subledger/bank-reconciliation'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'
import { dedupeTransactions } from '@/lib/dashboard/transaction-dedupe'
import { filterBankAdvisoryTransactions } from '@/lib/classification/bank-advisory'

function countByMonth(
  txs: Array<{ date: string; id?: string; source?: string }>,
  months: string[]
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of months) {
    out[m] = filterTransactionsForPeriod(txs, m).length
  }
  return out
}

function pipeline(txs: Array<{ date: string; id?: string; source?: string; description?: string; debit?: number | null; credit?: number | null }>) {
  return dedupeTransactions(
    filterBankAdvisoryTransactions(
      repairUsMisparsedAustralianDates(repairStatementDateAnomalies(txs))
    )
  )
}

/** Canonical Q3 bank (5) — view-period-range.test.ts */
const Q3_BANK = [
  { id: 'q3_1', date: '2026-01-14', description: 'BP', debit: 61.64, credit: null, source: 'bank' as const },
  { id: 'q3_2', date: '2026-01-19', description: 'Liberty', debit: 84.04, credit: null, source: 'bank' as const },
  { id: 'q3_3', date: '2026-02-11', description: 'Company freight', debit: 158.7, credit: null, source: 'bank' as const },
  { id: 'q3_4', date: '2026-01-23', description: 'IBIS bank', debit: 211.71, credit: null, source: 'bank' as const },
  { id: 'q3_5', date: '2026-03-19', description: 'Mirprintec bank', debit: 893.25, credit: null, source: 'bank' as const },
]

/** Q3 bank wrongly folded to Apr–Jun (restore-folded-q3-bank-dates.test.ts) */
const Q3_BANK_FOLDED = [
  { id: 'q3_1', date: '2026-04-14', description: 'BP', debit: 61.64, credit: null, source: 'bank' as const },
  { id: 'q3_2', date: '2026-04-19', description: 'Liberty', debit: 84.04, credit: null, source: 'bank' as const },
  { id: 'q3_3', date: '2026-05-11', description: 'Company freight', debit: 158.7, credit: null, source: 'bank' as const },
  { id: 'q3_4', date: '2026-04-08', description: 'Gravatt East', debit: 45.59, credit: null, source: 'bank' as const },
  { id: 'q3_5', date: '2026-06-03', description: 'Etsy', debit: 0.56, credit: null, source: 'bank' as const },
]

/** Q3 cash — must never appear in bank recon */
const Q3_CASH = [
  { id: 'cash_asic', date: '2026-01-09', source: 'manual' as const, description: 'ASIC', debit: 611, credit: null },
  { id: 'cash_case', date: '2026-01-19', source: 'manual' as const, description: 'Travel case', debit: 152.1, credit: null },
  { id: 'cash_ibis', date: '2026-01-23', source: 'manual' as const, description: 'IBIS', debit: 211.71, credit: null },
  { id: 'cash_hana', date: '2026-02-11', source: 'manual' as const, description: 'Hanaone cash', debit: 129.6, credit: null },
  { id: 'cash_mir', date: '2026-03-19', source: 'manual' as const, description: 'Mirprintec', debit: 893.25, credit: null },
]

/** Parsed Q4 Apr–Jun — repair-statement-date-anomalies.test.ts q4Rows (abbreviated import inline) */
const Q4_BANK = [
  { date: '2026-04-01', description: 'Hanaone Express', debit: 153.2, credit: null, source: 'bank' as const, id: 'q4_1' },
  { date: '2026-04-01', description: 'Mr Jinsoo Kim Loan', debit: null, credit: 500, source: 'bank' as const, id: 'q4_2' },
  { date: '2026-04-01', description: 'Mjr', debit: 660, credit: null, source: 'bank' as const, id: 'q4_3' },
  { date: '2026-04-07', description: 'Associated Cleaning', debit: null, credit: 3526.6, source: 'bank' as const, id: 'q4_4' },
  { date: '2026-04-08', description: 'Gravatt East)', debit: 45.59, credit: null, source: 'bank' as const, id: 'q4_5' },
  { date: '2026-04-09', description: 'Liberty', debit: 84.04, credit: null, source: 'bank' as const, id: 'q4_6' },
  { date: '2026-04-13', description: 'MJR Enterprise', debit: 528, credit: null, source: 'bank' as const, id: 'q4_7' },
  { date: '2026-04-14', description: 'BP', debit: 61.64, credit: null, source: 'bank' as const, id: 'q4_8' },
  { date: '2026-04-17', description: 'Hanaone Express', debit: 108, credit: null, source: 'bank' as const, id: 'q4_9' },
  { date: '2026-04-17', description: 'AK Innovation', debit: null, credit: 2112, source: 'bank' as const, id: 'q4_10' },
  { date: '2026-04-20', description: 'Tk Maxx', debit: 89.98, credit: null, source: 'bank' as const, id: 'q4_11' },
  { date: '2026-04-20', description: 'Oomenrgy Logan', debit: 62.43, credit: null, source: 'bank' as const, id: 'q4_12' },
  { date: '2026-04-23', description: 'Caltex', debit: 58.58, credit: null, source: 'bank' as const, id: 'q4_13' },
  { date: '2026-04-24', description: 'AK Innovation', debit: null, credit: 715, source: 'bank' as const, id: 'q4_14' },
  { date: '2026-04-27', description: 'MJR Enterprise', debit: 660, credit: null, source: 'bank' as const, id: 'q4_15' },
  { date: '2026-05-01', description: 'BP', debit: 73.55, credit: null, source: 'bank' as const, id: 'q4_16' },
  { date: '2026-05-04', description: 'Stripe', debit: null, credit: 0.68, source: 'bank' as const, id: 'q4_17' },
  { date: '2026-05-04', description: 'Google Australia', debit: 9.52, credit: null, source: 'bank' as const, id: 'q4_18' },
  { date: '2026-05-06', description: 'MJR Enterprise', debit: 330, credit: null, source: 'bank' as const, id: 'q4_19' },
  { date: '2026-05-07', description: 'Associated Cleaning', debit: null, credit: 3526.6, source: 'bank' as const, id: 'q4_20' },
  { date: '2026-05-08', description: 'BP', debit: 60.39, credit: null, source: 'bank' as const, id: 'q4_21' },
  { date: '2026-05-11', description: 'OKTAX', debit: 1133, credit: null, source: 'bank' as const, id: 'q4_22' },
  { date: '2026-05-12', description: 'ATO', debit: null, credit: 18, source: 'bank' as const, id: 'q4_23' },
  { date: '2026-05-13', description: 'Etsy', debit: 26, credit: null, source: 'bank' as const, id: 'q4_24' },
  { date: '2026-05-15', description: 'BP', debit: 60.86, credit: null, source: 'bank' as const, id: 'q4_25' },
  { date: '2025-05-18', description: 'Jason Selpic', debit: null, credit: 1012, source: 'bank' as const, id: 'q4_26' },
  { date: '2026-05-18', description: 'Cyc Company Pty', debit: 594, credit: null, source: 'bank' as const, id: 'q4_27' },
  { date: '2026-05-22', description: 'BP', debit: 70.82, credit: null, source: 'bank' as const, id: 'q4_28' },
  { date: '2026-05-29', description: 'BP', debit: 65.32, credit: null, source: 'bank' as const, id: 'q4_29' },
  { date: '2026-06-01', description: 'Cyc Company Pty', debit: 660, credit: null, source: 'bank' as const, id: 'q4_30' },
  { date: '2026-06-03', description: 'Liberty', debit: 81.09, credit: null, source: 'bank' as const, id: 'q4_31' },
  { date: '2026-06-03', description: 'Etsy', debit: 0.56, credit: null, source: 'bank' as const, id: 'q4_32' },
  { date: '2026-06-03', description: 'Google Australia', debit: 12.98, credit: null, source: 'bank' as const, id: 'q4_33' },
  { date: '2026-06-05', description: 'Associated Cleaning', debit: null, credit: 3526.6, source: 'bank' as const, id: 'q4_34' },
  { date: '2026-06-08', description: 'Cyc Company Pty', debit: 264, credit: null, source: 'bank' as const, id: 'q4_35' },
  { date: '2026-06-12', description: 'BP', debit: 70.64, credit: null, source: 'bank' as const, id: 'q4_36' },
  { date: '2026-06-19', description: 'BP', debit: 69.59, credit: null, source: 'bank' as const, id: 'q4_37' },
  { date: '2026-06-22', description: 'Vistaprint', debit: 85.18, credit: null, source: 'bank' as const, id: 'q4_38' },
  { date: '2026-06-24', description: 'Mr Jinsoo Kim Return', debit: null, credit: 50.85, source: 'bank' as const, id: 'q4_39' },
  { date: '2026-06-24', description: 'Jinsoo Kim Z', debit: 50.85, credit: null, source: 'bank' as const, id: 'q4_40' },
  { date: '2026-06-24', description: 'Jinsoo Kim V753', debit: 129.6, credit: null, source: 'bank' as const, id: 'q4_41' },
  { date: '2026-06-24', description: 'Jinsoo Kim J178', debit: 152.1, credit: null, source: 'bank' as const, id: 'q4_42' },
  { date: '2026-06-24', description: 'Jinsoo Kim Y128', debit: 211.71, credit: null, source: 'bank' as const, id: 'q4_43' },
  { date: '2026-06-24', description: 'Jinsoo Kim N197', debit: 599.75, credit: null, source: 'bank' as const, id: 'q4_44' },
  { date: '2026-06-24', description: 'Jinsoo Kim D523', debit: 611, credit: null, source: 'bank' as const, id: 'q4_45' },
  { date: '2026-06-24', description: 'Jinsoo Kim V067', debit: 893.25, credit: null, source: 'bank' as const, id: 'q4_46' },
  { date: '2026-06-24', description: 'Jinsoo Kim K557', debit: 1516.08, credit: null, source: 'bank' as const, id: 'q4_47' },
  { date: '2026-06-24', description: 'Jinsoo Kim K229', debit: 2334.2, credit: null, source: 'bank' as const, id: 'q4_48' },
  { date: '2026-06-24', description: 'Jinsoo Kim R277', debit: 2334.2, credit: null, source: 'bank' as const, id: 'q4_49' },
  { date: '2026-06-29', description: 'Caltex', debit: 81.38, credit: null, source: 'bank' as const, id: 'q4_50' },
]

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']

describe('Selpic bank recon month audit Jan–Jun 2026', () => {
  it('correct Q3 dates: 5 bank rows in Jan–Mar only; cash excluded', () => {
    const ledger = pipeline([...Q3_BANK, ...Q3_CASH])
    expect(countByMonth(ledger, MONTHS)).toEqual({
      '2026-01': 3,
      '2026-02': 1,
      '2026-03': 1,
      '2026-04': 0,
      '2026-05': 0,
      '2026-06': 0,
    })
  })

  it('folded Q3 dates (bug): bank rows land in Apr–Jun, Jan–Mar look empty', () => {
    const ledger = pipeline([...Q3_BANK_FOLDED, ...Q3_CASH])
    expect(countByMonth(ledger, MONTHS)).toEqual({
      '2026-01': 0,
      '2026-02': 0,
      '2026-03': 0,
      '2026-04': 3,
      '2026-05': 1,
      '2026-06': 1,
    })
  })

  it('Q4 parse alone: 50 bank rows Apr–Jun (Jason 2025 excluded from 2026-05)', () => {
    const ledger = pipeline(Q4_BANK)
    const counts = countByMonth(ledger, MONTHS)
    expect(counts['2026-01']).toBe(0)
    expect(counts['2026-02']).toBe(0)
    expect(counts['2026-03']).toBe(0)
    expect(counts['2026-04']).toBe(15)
    expect(counts['2026-05']).toBe(14) // Jason 2025-05-18 OCR-repaired → 2026-05-18
    expect(counts['2026-06']).toBe(21)
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(50)
  })

  it('Q3 correct + Q4 merged: 55 bank rows total; Jan–Mar + Apr–Jun', () => {
    const ledger = pipeline([...Q3_BANK, ...Q4_BANK, ...Q3_CASH])
    const counts = countByMonth(ledger, MONTHS)
    expect(counts['2026-01']).toBe(3)
    expect(counts['2026-02']).toBe(1)
    expect(counts['2026-03']).toBe(1)
    expect(counts['2026-04']).toBe(15)
    expect(counts['2026-05']).toBe(14)
    expect(counts['2026-06']).toBe(21)
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(55)
  })

  it('folded Q3 + Q4: duplicates BP/Liberty in Apr when Q4 also has same merchants', () => {
    const ledger = pipeline([...Q3_BANK_FOLDED, ...Q4_BANK, ...Q3_CASH])
    const counts = countByMonth(ledger, MONTHS)
    // Apr gets Q3 folded (3) + Q4 (15) = 18 — NOT 15
    expect(counts['2026-04']).toBeGreaterThan(15)
    expect(counts['2026-01']).toBe(0)
  })
})
