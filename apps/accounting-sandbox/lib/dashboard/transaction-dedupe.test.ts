import { describe, expect, it } from 'vitest'
import {
  buildTransactionFingerprint,
  dedupeTransactions,
} from '@/lib/dashboard/transaction-dedupe'

describe('transaction dedupe', () => {
  it('treats same date amount description as duplicate', () => {
    const a = {
      date: '2025-07-01',
      description: 'EFTPOS WOOLWORTHS SYDNEY',
      debit: 50,
      credit: null,
      category: 'UNCATEGORIZED',
    }
    const b = {
      ...a,
      id: 'tx_other',
      description: 'VISA WOOLWORTHS  SYDNEY NSW',
    }
    const result = dedupeTransactions([a, b])
    expect(result).toHaveLength(1)
    expect(buildTransactionFingerprint(a)).toBe(buildTransactionFingerprint(b))
  })

  it('keeps classified row over uncategorised duplicate', () => {
    const uncategorised = {
      date: '2025-07-02',
      description: 'BP PETROL',
      debit: 80,
      credit: null,
      category: 'UNCATEGORIZED',
    }
    const classified = {
      ...uncategorised,
      id: 'tx_classified',
      category: 'EXPENSE_FUEL_TRAVEL',
      confidence: 0.75,
    }
    const result = dedupeTransactions([uncategorised, classified])
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('EXPENSE_FUEL_TRAVEL')
  })
})
