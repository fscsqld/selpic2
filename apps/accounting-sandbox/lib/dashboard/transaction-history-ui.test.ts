import { describe, expect, it } from 'vitest'
import {
  pickPeriodWithMostTransactions,
  pickEarliestPeriodWithTransactions,
  getDistinctPeriodIdsFromTransactions,
} from '@/lib/dashboard/transaction-history-ui'

describe('pickPeriodWithMostTransactions', () => {
  it('returns the month with the most transactions', () => {
    const period = pickPeriodWithMostTransactions([
      { date: '2025-07-01' },
      { date: '2025-07-15' },
      { date: '2025-08-01' },
    ])
    expect(period).toBe('2025-07')
  })

  it('returns null for empty input', () => {
    expect(pickPeriodWithMostTransactions([])).toBeNull()
  })
})

describe('pickEarliestPeriodWithTransactions', () => {
  it('returns the earliest month in a multi-month statement', () => {
    const period = pickEarliestPeriodWithTransactions([
      { date: '2025-06-01' },
      { date: '2025-06-02' },
      { date: '2025-04-15' },
      { date: '2025-05-20' },
    ])
    expect(period).toBe('2025-04')
  })
})

describe('getDistinctPeriodIdsFromTransactions', () => {
  it('lists sorted unique months', () => {
    expect(
      getDistinctPeriodIdsFromTransactions([
        { date: '2025-06-01' },
        { date: '2025-04-15' },
        { date: '2025-05-20' },
        { date: '2025-06-10' },
      ])
    ).toEqual(['2025-04', '2025-05', '2025-06'])
  })
})
