import { describe, expect, it } from 'vitest'
import {
  healCompanyLedgerDates,
  periodLooksLikeBasQ3,
  restoreBankRowsNotOnCanonicalQ4,
  restoreFoldedQ3BankDates,
  reverseFoldedQ4DateToQ3,
  shiftAprJunBackToJanMar,
} from '@/lib/utils/restore-folded-q3-bank-dates'
import { filterTransactionsForDateRange } from '@/lib/dashboard/view-period-range'

describe('restoreFoldedQ3BankDates', () => {
  const q3BankFoldedToQ4 = [
    { date: '2026-04-14', description: 'BP', debit: 61.64, credit: null, source: 'bank', id: 'q3_1' },
    { date: '2026-04-19', description: 'Liberty', debit: 84.04, credit: null, source: 'bank', id: 'q3_2' },
    { date: '2026-05-11', description: 'Company freight', debit: 158.7, credit: null, source: 'bank', id: 'q3_3' },
    { date: '2026-04-08', description: 'Gravatt East', debit: 45.59, credit: null, source: 'bank', id: 'q3_4' },
    { date: '2026-06-03', description: 'Etsy', debit: 0.56, credit: null, source: 'bank', id: 'q3_5' },
  ]

  const q4Statement = Array.from({ length: 50 }, (_, i) => ({
    date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
    description: `Q4 parsed ${i}`,
    debit: i % 3 === 0 ? 20 + i : null,
    credit: i % 3 === 0 ? null : 100,
    source: 'bank' as const,
    id: `q4_${i}`,
  }))

  it('maps Apr→Jan, May→Feb, Jun→Mar', () => {
    expect(shiftAprJunBackToJanMar('2026-04-14')).toBe('2026-01-14')
    expect(shiftAprJunBackToJanMar('2026-05-11')).toBe('2026-02-11')
    expect(shiftAprJunBackToJanMar('2026-06-03')).toBe('2026-03-03')
    expect(reverseFoldedQ4DateToQ3('2026-04-01')).toBe('2026-01-04')
    expect(reverseFoldedQ4DateToQ3('2026-06-03')).toBe('2026-03-06')
    expect(reverseFoldedQ4DateToQ3('2026-04-14')).toBe('2026-01-14')
  })

  it('restores when statement period is still Q3 but rows were saved as Apr–Jun', () => {
    const restored = restoreFoldedQ3BankDates(q3BankFoldedToQ4, q4Statement, {
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    })
    expect(periodLooksLikeBasQ3({ startDate: '2026-01-01', endDate: '2026-03-31' })).toBe(
      true
    )
    expect(restored.map((tx) => tx.date)).toEqual([
      '2026-01-14',
      '2026-01-19',
      '2026-02-11',
      '2026-01-08',
      '2026-03-06',
    ])
  })

  it('restores a 5-row Q3 file beside Q4 even when merchants/amounts overlap', () => {
    const q4WithSameMerchants = [
      ...q4Statement,
      { date: '2026-04-09', description: 'Liberty', debit: 84.04, credit: null, source: 'bank', id: 'q4_lib' },
      { date: '2026-04-23', description: 'BP', debit: 61.64, credit: null, source: 'bank', id: 'q4_bp' },
    ]
    const restored = restoreFoldedQ3BankDates(q3BankFoldedToQ4, q4WithSameMerchants, {
      startDate: '2026-04-01',
      endDate: '2026-06-03',
    })
    expect(restored.map((tx) => tx.date)).toEqual([
      '2026-01-14',
      '2026-01-19',
      '2026-02-11',
      '2026-01-08',
      '2026-03-06',
    ])
  })

  it('does not shift a real Q4 statement', () => {
    const restored = restoreFoldedQ3BankDates(q4Statement, q3BankFoldedToQ4, {
      startDate: '2026-04-01',
      endDate: '2026-06-29',
    })
    expect(restored[0]?.date).toBe('2026-04-01')
    expect(restored).toHaveLength(50)
  })
})

describe('restoreBankRowsNotOnCanonicalQ4 (50 parsed vs 55 in P&L period)', () => {
  it('moves the extra 5 bank rows out of Apr–Jun back to Q3', () => {
    const q4Parsed = Array.from({ length: 50 }, (_, i) => ({
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
      description: `Parsed ${i}`,
      debit: 10,
      credit: null as number | null,
      source: 'bank' as const,
      id: `stmt50_${i}`,
    }))
    const foldedQ3 = [
      { date: '2026-04-14', description: 'BP', debit: 61.64, credit: null, source: 'bank' as const, id: 'q3_a' },
      { date: '2026-04-19', description: 'Liberty', debit: 84.04, credit: null, source: 'bank' as const, id: 'q3_b' },
      { date: '2026-05-11', description: 'Freight', debit: 158.7, credit: null, source: 'bank' as const, id: 'q3_c' },
      { date: '2026-04-08', description: 'Gravatt', debit: 45.59, credit: null, source: 'bank' as const, id: 'q3_d' },
      { date: '2026-06-03', description: 'Etsy', debit: 0.56, credit: null, source: 'bank' as const, id: 'q3_e' },
    ]
    const cash = {
      date: '2026-01-09',
      description: 'ASIC',
      debit: 611,
      credit: null as number | null,
      source: 'manual' as const,
      id: 'cash_asic',
    }
    const ledger = [...q4Parsed, ...foldedQ3, cash]
    const inQ4Before = filterTransactionsForDateRange(ledger, '2026-04-01', '2026-06-30')
    expect(inQ4Before).toHaveLength(55)

    const healed = restoreBankRowsNotOnCanonicalQ4(ledger, q4Parsed)
    const inQ4 = filterTransactionsForDateRange(healed, '2026-04-01', '2026-06-30')
    const inQ3 = filterTransactionsForDateRange(healed, '2026-01-01', '2026-03-31')
    expect(inQ4).toHaveLength(50)
    expect(inQ3.filter((tx) => tx.source === 'bank')).toHaveLength(5)
    expect(inQ3.filter((tx) => tx.source === 'manual')).toHaveLength(1)
  })

  it('does not dump a duplicate Q4 row (same date+merchant+amount, new id) into Q3', () => {
    const q4Parsed = Array.from({ length: 50 }, (_, i) => ({
      date: i === 0 ? '2026-04-19' : `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
      description: i === 0 ? 'Liberty' : `Parsed ${i}`,
      debit: i === 0 ? 84.04 : 10,
      credit: null as number | null,
      source: 'bank' as const,
      id: `stmt50_${i}`,
    }))
    const duplicateQ4 = {
      date: '2026-04-19',
      description: 'Liberty',
      debit: 84.04,
      credit: null as number | null,
      source: 'bank' as const,
      id: 'full_stmt_liberty',
    }
    const healed = restoreBankRowsNotOnCanonicalQ4([...q4Parsed, duplicateQ4], q4Parsed)
    expect(healed.find((tx) => tx.id === 'full_stmt_liberty')?.date).toBe('2026-04-19')
    expect(healed.find((tx) => tx.id === 'stmt50_0')?.date).toBe('2026-04-19')
  })

  it('heals Q3 statementId group even when merchants overlap Q4', () => {
    const q4 = Array.from({ length: 50 }, (_, i) => ({
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
      description: i === 0 ? 'Liberty' : `Q4 ${i}`,
      debit: i === 0 ? 84.04 : 10,
      credit: null as number | null,
      source: 'bank' as const,
      id: `q4_${i}`,
      statementId: 'stmt-q4',
    }))
    const q3 = [
      {
        date: '2026-04-19',
        description: 'Liberty',
        debit: 84.04,
        credit: null as number | null,
        source: 'bank' as const,
        id: 'q3_lib',
        statementId: 'stmt-q3',
      },
      {
        date: '2026-04-14',
        description: 'BP',
        debit: 61.64,
        credit: null as number | null,
        source: 'bank' as const,
        id: 'q3_bp',
        statementId: 'stmt-q3',
      },
      {
        date: '2026-05-11',
        description: 'Freight',
        debit: 158.7,
        credit: null as number | null,
        source: 'bank' as const,
        id: 'q3_fr',
        statementId: 'stmt-q3',
      },
      {
        date: '2026-04-08',
        description: 'Gravatt',
        debit: 45.59,
        credit: null as number | null,
        source: 'bank' as const,
        id: 'q3_g',
        statementId: 'stmt-q3',
      },
      {
        date: '2026-06-03',
        description: 'Etsy',
        debit: 0.56,
        credit: null as number | null,
        source: 'bank' as const,
        id: 'q3_e',
        statementId: 'stmt-q3',
      },
    ]
    const cash = {
      date: '2026-01-09',
      description: 'ASIC',
      debit: 611,
      credit: null as number | null,
      source: 'manual' as const,
      id: 'cash_asic',
    }
    const healed = healCompanyLedgerDates([...q4, ...q3, cash])
    const inQ4 = filterTransactionsForDateRange(healed, '2026-04-01', '2026-06-30')
    const inQ3 = filterTransactionsForDateRange(healed, '2026-01-01', '2026-03-31')
    expect(inQ4).toHaveLength(50)
    expect(inQ3.filter((tx) => tx.source === 'bank')).toHaveLength(5)
    expect(inQ3.filter((tx) => tx.source === 'manual')).toHaveLength(1)
  })

  it('does not rewrite cash or canonical Q4 rows', () => {
    const q4 = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      description: `Q4 ${i}`,
      debit: 5,
      credit: null as number | null,
      source: 'bank' as const,
      id: `c_${i}`,
    }))
    const cashApr = {
      date: '2026-04-02',
      description: 'Should stay cash',
      debit: 99,
      credit: null as number | null,
      source: 'manual' as const,
      id: 'cash_x',
    }
    const healed = restoreBankRowsNotOnCanonicalQ4([...q4, cashApr], q4)
    expect(healed.find((tx) => tx.id === 'c_0')?.date).toBe('2026-05-01')
    expect(healed.find((tx) => tx.id === 'cash_x')?.date).toBe('2026-04-02')
  })
})
