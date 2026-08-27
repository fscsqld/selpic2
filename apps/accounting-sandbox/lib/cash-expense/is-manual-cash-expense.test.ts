import { describe, expect, it } from 'vitest'
import {
  isManualCashExpenseRow,
  resolveCashExpenseId,
} from './is-manual-cash-expense'

describe('isManualCashExpenseRow', () => {
  it('accepts source=manual', () => {
    expect(isManualCashExpenseRow({ id: 'cash_1', source: 'manual' })).toBe(true)
    expect(isManualCashExpenseRow({ id: 'legacy_x', source: 'manual' })).toBe(true)
  })

  it('accepts cash_ id even if source missing', () => {
    expect(isManualCashExpenseRow({ id: 'cash_173_abc' })).toBe(true)
  })

  it('rejects bank statement rows', () => {
    expect(isManualCashExpenseRow({ id: 'stmt_1', source: 'bank' })).toBe(false)
    expect(isManualCashExpenseRow({ id: '2026-01-15_NAB', source: undefined })).toBe(
      false
    )
  })
})

describe('resolveCashExpenseId', () => {
  it('returns cash id for manual rows', () => {
    expect(
      resolveCashExpenseId({ id: 'cash_173_abc', source: 'manual' })
    ).toBe('cash_173_abc')
  })

  it('returns null for bank rows (adjacent: never delete bank via cash UI)', () => {
    expect(resolveCashExpenseId({ id: 'bank_1', source: 'bank' })).toBeNull()
    expect(resolveCashExpenseId({ id: 'cash_x_1_0' /* still cash_ */ })).toBe(
      'cash_x_1_0'
    )
  })
})
