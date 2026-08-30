import { describe, expect, it } from 'vitest'
import {
  evaluateRecoverEligibility,
  filterRowsForStatementRecover,
  isCashLikeLedgerRow,
  isRecoveredCacheStatement,
} from '@/lib/storage/recovered-statement'

describe('recovered cache statements', () => {
  it('detects Recovered bank name and recovered_*.cache file', () => {
    expect(isRecoveredCacheStatement({ bankName: 'Recovered', fileName: 'x.csv' })).toBe(true)
    expect(
      isRecoveredCacheStatement({
        bankName: 'NAB',
        fileName: 'recovered_2026-08-19_80tx.cache',
      })
    ).toBe(true)
  })

  it('does not flag real uploads', () => {
    expect(isRecoveredCacheStatement({ bankName: 'NAB', fileName: 'nab-q4.pdf' })).toBe(false)
    expect(isRecoveredCacheStatement({})).toBe(false)
  })
})

describe('filterRowsForStatementRecover (multi-user / cash store)', () => {
  it('strips cash_* so Recover does not double cash expenses on reload', () => {
    const rows = [
      { id: 'bank_1', source: 'bank' as const },
      { id: 'cash_stamp', source: 'manual' as const },
      { id: 'bank_2' },
    ]
    expect(filterRowsForStatementRecover(rows).map((r) => r.id)).toEqual(['bank_1', 'bank_2'])
  })

  it('treats only cash_ prefix as cash-like (not every manual row)', () => {
    expect(isCashLikeLedgerRow({ id: 'cash_x' })).toBe(true)
    expect(isCashLikeLedgerRow({ id: 'tx_1', source: 'manual' })).toBe(false)
  })
})

describe('evaluateRecoverEligibility (other merchants / empty / hydrate)', () => {
  it('hides banner until History has hydrated (avoids false empty flash)', () => {
    expect(
      evaluateRecoverEligibility({
        historyHydrated: false,
        statements: [],
        recoverableCacheCount: 40,
      })
    ).toEqual({ showBanner: false, allowRecover: false, blockReason: null })
  })

  it('shows Recover for a new empty History with browser cache only', () => {
    expect(
      evaluateRecoverEligibility({
        historyHydrated: true,
        statements: [],
        recoverableCacheCount: 12,
      })
    ).toEqual({ showBanner: true, allowRecover: true, blockReason: null })
  })

  it('hides Recover for a brand-new user with no cache', () => {
    expect(
      evaluateRecoverEligibility({
        historyHydrated: true,
        statements: [],
        recoverableCacheCount: 0,
      }).showBanner
    ).toBe(false)
  })

  it('blocks Recover when a real bank statement already exists', () => {
    const result = evaluateRecoverEligibility({
      historyHydrated: true,
      statements: [
        { bankName: 'NAB', fileName: 'q3.pdf', transactions: [{ id: '1' }] },
      ],
      recoverableCacheCount: 99,
    })
    expect(result.showBanner).toBe(false)
    expect(result.allowRecover).toBe(false)
    expect(result.blockReason).toMatch(/duplicate/i)
  })

  it('blocks second Recover when recovered_*.cache already listed', () => {
    const result = evaluateRecoverEligibility({
      historyHydrated: true,
      statements: [
        {
          bankName: 'Recovered',
          fileName: 'recovered_2026-08-25_10tx.cache',
          transactions: [{ id: '1' }],
        },
      ],
      recoverableCacheCount: 10,
    })
    expect(result.allowRecover).toBe(false)
    expect(result.blockReason).toMatch(/already exists/i)
  })
})
