import { beforeEach, describe, expect, it } from 'vitest'
import {
  ensureMonthlyDocNumber,
  getMonthlyPlaceholder,
  monthlySequenceStorageKey,
  PO_DRAFT_PLACEHOLDER,
} from './invoiceRefNumber'

describe('invoiceRefNumber PO prefix', () => {
  beforeEach(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    window.localStorage.removeItem(monthlySequenceStorageKey('PO', year, month))
  })

  it('returns monthly PO placeholder', () => {
    const p = getMonthlyPlaceholder('PO')
    expect(p).toMatch(/^PO-\d{4}-\d{2}-000$/)
  })

  it('allocates sequential PO numbers from monthly placeholder', () => {
    const placeholder = getMonthlyPlaceholder('PO')
    const a = ensureMonthlyDocNumber('PO', placeholder)
    const b = ensureMonthlyDocNumber('PO', placeholder)
    expect(a).toMatch(/^PO-\d{4}-\d{2}-001$/)
    expect(b).toMatch(/^PO-\d{4}-\d{2}-002$/)
  })

  it('allocates from PO-DRAFT-000', () => {
    const n = ensureMonthlyDocNumber('PO', PO_DRAFT_PLACEHOLDER)
    expect(n).toMatch(/^PO-\d{4}-\d{2}-00\d$/)
  })

  it('does not reallocate a finalized PO number', () => {
    const fixed = 'PO-2026-10-042'
    expect(ensureMonthlyDocNumber('PO', fixed)).toBe(fixed)
  })
})
