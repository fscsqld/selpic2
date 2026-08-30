import { describe, expect, it } from 'vitest'
import {
  filterTransactionsForDateRange,
  mergeManualCashExpenses,
  viewPeriodMatchesRange,
} from '@/lib/dashboard/view-period-range'

describe('mergeManualCashExpenses', () => {
  it('merges manual cash into bank rows without duplicating ids', () => {
    const bank = [
      { id: 'b1', date: '2026-03-01', source: 'bank', description: 'Fee' },
    ]
    const ledger = [
      ...bank,
      { id: 'cash_1', date: '2026-03-15', source: 'manual', description: 'Case' },
      { id: 'cash_1', date: '2026-03-15', source: 'manual', description: 'Case dup' },
    ]
    const merged = mergeManualCashExpenses(bank, ledger)
    expect(merged).toHaveLength(2)
    expect(merged.some((tx) => tx.id === 'cash_1')).toBe(true)
  })

  it('respects date window when provided', () => {
    const bank = [{ id: 'b1', date: '2026-03-01', source: 'bank' }]
    const ledger = [
      { id: 'cash_in', date: '2026-03-10', source: 'manual' },
      { id: 'cash_out', date: '2026-04-01', source: 'manual' },
    ]
    const merged = mergeManualCashExpenses(bank, ledger, '2026-01-01', '2026-03-31')
    expect(merged.map((tx) => tx.id)).toEqual(['b1', 'cash_in'])
  })
})

describe('viewPeriodMatchesRange', () => {
  it('returns true when banner dates equal BAS quarter', () => {
    expect(
      viewPeriodMatchesRange(
        { preset: 'bas_q3', startDate: '2026-01-01', endDate: '2026-03-31' },
        '2026-01-01',
        '2026-03-31'
      )
    ).toBe(true)
  })
})

describe('filterBusinessLedgerForPeriod', () => {
  it('keeps Q4 bank, earlier-statement bank, and director cash inside a Dec–Jun banner', async () => {
    const { filterBusinessLedgerForPeriod, viewPeriodExtendsBeyondStatement } = await import(
      '@/lib/dashboard/view-period-range'
    )
    const q4Statement = [
      { id: 'q4a', date: '2026-04-14', source: 'bank' },
      { id: 'q4b', date: '2026-06-29', source: 'bank' },
    ]
    const ledger = [
      { id: 'cash_air', date: '2025-12-07', source: 'manual' },
      { id: 'q3bank', date: '2026-02-11', source: 'bank' },
      ...q4Statement,
      { id: 'pay1', date: '2026-05-01', source: 'payroll', isPayrollTransaction: true },
      { id: 'after', date: '2026-07-02', source: 'bank' },
    ]
    const period = filterBusinessLedgerForPeriod(ledger, '2025-12-07', '2026-06-29')
    expect(period.map((tx) => tx.id)).toEqual(['cash_air', 'q3bank', 'q4a', 'q4b'])
    expect(
      viewPeriodExtendsBeyondStatement(
        { startDate: '2025-12-07', endDate: '2026-06-29' },
        q4Statement
      )
    ).toBe(true)
  })

  it('Q4 banner still excludes Dec cash and Q3 bank', async () => {
    const { filterBusinessLedgerForPeriod } = await import('@/lib/dashboard/view-period-range')
    const period = filterBusinessLedgerForPeriod(
      [
        { id: 'cash_air', date: '2025-12-07', source: 'manual' },
        { id: 'q3bank', date: '2026-02-11', source: 'bank' },
        { id: 'q4a', date: '2026-04-14', source: 'bank' },
      ],
      '2026-04-01',
      '2026-06-30'
    )
    expect(period.map((tx) => tx.id)).toEqual(['q4a'])
  })

  it('keeps Jason Selpic trading credit in Dec–Jun after OCR year repair', async () => {
    const { filterBusinessLedgerForPeriod } = await import('@/lib/dashboard/view-period-range')
    const { repairStatementDateAnomalies } = await import(
      '@/lib/utils/repair-statement-date-anomalies'
    )
    const ledger = [
      { id: 'a', date: '2026-04-01', source: 'bank' },
      { id: 'b', date: '2026-04-15', source: 'bank' },
      { id: 'c', date: '2026-05-01', source: 'bank' },
      { id: 'd', date: '2026-05-15', source: 'bank' },
      { id: 'e', date: '2026-06-01', source: 'bank' },
      { id: 'f', date: '2026-06-15', source: 'bank' },
      {
        id: 'jason',
        date: '2025-05-18',
        description: 'Jason Selpic',
        source: 'bank',
        credit: 1012,
      },
    ]
    const unrepaired = filterBusinessLedgerForPeriod(ledger, '2025-12-07', '2026-06-29')
    expect(unrepaired.some((tx) => tx.id === 'jason')).toBe(false)
    const repaired = filterBusinessLedgerForPeriod(
      repairStatementDateAnomalies(ledger),
      '2025-12-07',
      '2026-06-29'
    )
    expect(repaired.find((tx) => tx.id === 'jason')?.date).toBe('2026-05-18')
  })

  it('Q3 includes both same-day Stamp Zone cash expenses after date repair', async () => {
    const { filterBusinessLedgerForPeriod } = await import('@/lib/dashboard/view-period-range')
    const { repairStatementDateAnomalies } = await import(
      '@/lib/utils/repair-statement-date-anomalies'
    )
    const { dedupeTransactions } = await import('@/lib/dashboard/transaction-dedupe')
    const cash = [
      { id: 'cash_asic', date: '2026-01-09', source: 'manual', description: 'ASIC', debit: 611, confidence: 'Manual' },
      { id: 'cash_case', date: '2026-01-19', source: 'manual', description: 'Travel case', debit: 152.1, confidence: 'Manual' },
      { id: 'cash_ibis', date: '2026-01-23', source: 'manual', description: 'IBIS Style', debit: 211.71, confidence: 'Manual' },
      { id: 'cash_samsung', date: '2026-01-27', source: 'manual', description: 'Samsung', debit: 599.75, confidence: 'Manual' },
      { id: 'cash_stamp_1', date: '2026-01-29', source: 'manual', description: 'Stamp Zone', debit: 2334.2, confidence: 'Manual' },
      { id: 'cash_stamp_2', date: '2026-01-29', source: 'manual', description: 'Stamp Zone', debit: 2334.2, confidence: 'Manual' },
      { id: 'cash_hana', date: '2026-02-11', source: 'manual', description: 'Hanaone', debit: 129.6, confidence: 'Manual' },
      { id: 'cash_mir', date: '2026-03-19', source: 'manual', description: 'Mirprintec', debit: 893.25, confidence: 'Manual' },
    ]
    const q3 = filterBusinessLedgerForPeriod(
      dedupeTransactions(repairStatementDateAnomalies(cash)),
      '2026-01-01',
      '2026-03-31'
    )
    expect(q3).toHaveLength(8)
    expect(q3.filter((tx) => tx.description === 'Stamp Zone')).toHaveLength(2)
    const cashTotal = q3.reduce((s, tx) => s + (tx.debit || 0), 0)
    expect(cashTotal).toBeCloseTo(7265.81, 2)
  })

  it('Q3 banner is 13 rows after US phantom repair (8 cash + 5 bank)', async () => {
    const { filterBusinessLedgerForPeriod } = await import('@/lib/dashboard/view-period-range')
    const { repairUsMisparsedAustralianDates } = await import(
      '@/lib/utils/repair-us-misparsed-au-dates'
    )
    const cash = [
      { id: 'cash_asic', date: '2026-01-09', source: 'manual' as const },
      { id: 'cash_case', date: '2026-01-19', source: 'manual' as const },
      { id: 'cash_ibis', date: '2026-01-23', source: 'manual' as const },
      { id: 'cash_samsung', date: '2026-01-27', source: 'manual' as const },
      { id: 'cash_stamp_1', date: '2026-01-29', source: 'manual' as const },
      { id: 'cash_stamp_2', date: '2026-01-29', source: 'manual' as const },
      { id: 'cash_hana', date: '2026-02-11', source: 'manual' as const },
      { id: 'cash_mir', date: '2026-03-19', source: 'manual' as const },
    ]
    const q3Bank = [
      { id: 'q3_1', date: '2026-01-14', source: 'bank' as const },
      { id: 'q3_2', date: '2026-01-19', source: 'bank' as const },
      { id: 'q3_3', date: '2026-02-11', source: 'bank' as const },
      { id: 'q3_4', date: '2026-01-23', source: 'bank' as const },
      { id: 'q3_5', date: '2026-03-19', source: 'bank' as const },
    ]
    const phantoms = Array.from({ length: 19 }, (_, i) => ({
      id: `ph_${i}`,
      date: '2026-01-04',
      source: 'bank' as const,
    }))
    const q4 = Array.from({ length: 40 }, (_, i) => ({
      id: `q4_${i}`,
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
      source: 'bank' as const,
    }))
    const fixed = repairUsMisparsedAustralianDates([...q4, ...phantoms, ...q3Bank, ...cash])
    const q3 = filterBusinessLedgerForPeriod(fixed, '2026-01-01', '2026-03-31')
    expect(q3).toHaveLength(13)
  })
})

describe('filterTransactionsForDateRange', () => {
  it('filters inclusive ISO range', () => {
    const txs = [{ date: '2026-03-25' }, { date: '2026-04-01' }]
    const filtered = filterTransactionsForDateRange(txs, '2026-01-01', '2026-03-31')
    expect(filtered).toHaveLength(1)
  })
})
