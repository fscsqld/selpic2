import { describe, expect, it } from 'vitest'
import { sortTransactionsChronologically } from '@/lib/dashboard/sort-transactions'
import { mergeManualCashExpenses } from '@/lib/dashboard/view-period-range'

describe('sortTransactionsChronologically', () => {
  it('interleaves bank and Cash Expense by date (not cash dumped at end)', () => {
    const rows = [
      { id: 'b1', date: '2026-03-01', source: 'bank', description: 'Fee' },
      { id: 'b2', date: '2026-03-20', source: 'bank', description: 'Fuel' },
      { id: 'cash_1', date: '2026-03-10', source: 'manual', description: 'Airfare' },
      { id: 'cash_2', date: '2025-12-15', source: 'manual', description: 'Qantas' },
    ]
    const sorted = sortTransactionsChronologically(rows)
    expect(sorted.map((r) => r.id)).toEqual(['cash_2', 'b1', 'cash_1', 'b2'])
  })

  it('normalises AU display dates before compare', () => {
    const rows = [
      { id: 'a', date: '15/03/2026', source: 'bank' },
      { id: 'b', date: '2026-03-01', source: 'bank' },
      { id: 'c', date: '10/03/2026', source: 'manual' },
    ]
    const sorted = sortTransactionsChronologically(rows)
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('keeps bank before cash on the same calendar day', () => {
    const rows = [
      { id: 'cash_1', date: '2026-05-18', source: 'manual' },
      { id: 'b1', date: '2026-05-18', source: 'bank' },
      { id: 'b2', date: '2026-05-18', source: 'bank' },
    ]
    const sorted = sortTransactionsChronologically(rows)
    expect(sorted.map((r) => r.id)).toEqual(['b1', 'b2', 'cash_1'])
  })
})

describe('mergeManualCashExpenses chronological', () => {
  it('returns date-ordered bank + cash', () => {
    const bank = [
      { id: 'b2', date: '2026-06-01', source: 'bank' },
      { id: 'b1', date: '2026-04-01', source: 'bank' },
    ]
    const ledger = [
      ...bank,
      { id: 'cash_1', date: '2026-05-01', source: 'manual' },
    ]
    expect(mergeManualCashExpenses(bank, ledger).map((t) => t.id)).toEqual([
      'b1',
      'cash_1',
      'b2',
    ])
  })
})
