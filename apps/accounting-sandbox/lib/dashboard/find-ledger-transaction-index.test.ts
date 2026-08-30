import { describe, expect, it } from 'vitest'
import { findLedgerTransactionIndex } from '@/lib/dashboard/find-ledger-transaction-index'

describe('findLedgerTransactionIndex', () => {
  const ledger = [
    { id: 'a', date: '2026-04-01', description: 'Other', debit: 10, credit: null },
    {
      id: 'jason1',
      date: '2025-05-18',
      description: 'Jason Selpic',
      debit: null,
      credit: 1012,
    },
    { id: 'c', date: '2026-05-07', description: 'Associated Cleaning', debit: null, credit: 100 },
  ]

  it('resolves stable id even when view index is from a filtered table', () => {
    // Jason is index 1 in full ledger, but History filter might show it as row 0
    expect(findLedgerTransactionIndex(ledger, 'jason1_0')).toBe(1)
    expect(findLedgerTransactionIndex(ledger, 'jason1_1')).toBe(1)
  })

  it('resolves date_description_viewIndex compounds', () => {
    expect(findLedgerTransactionIndex(ledger, '2025-05-18_Jason Selpic_0')).toBe(1)
  })
})
