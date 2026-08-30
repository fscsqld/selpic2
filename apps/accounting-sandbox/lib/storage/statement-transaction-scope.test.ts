import { describe, expect, it } from 'vitest'
import { patchStatementTransactions } from '@/lib/storage/statement-transaction-scope'

describe('patchStatementTransactions', () => {
  it('applies date correction when fingerprint changes (Jason OCR year)', () => {
    const statement = [
      {
        date: '2025-05-18',
        description: 'Jason Selpic',
        debit: null,
        credit: 1012,
        category: 'INCOME_SALES_CLEANING',
      },
      {
        date: '2026-04-01',
        description: 'Other',
        debit: 10,
        credit: null,
        category: 'EXPENSE_BANK_FEES',
      },
    ]
    const ledger = [
      {
        date: '2026-05-18',
        description: 'Jason Selpic',
        debit: null,
        credit: 1012,
        category: 'INCOME_SALES_CLEANING',
        confidence: 'Manual',
      },
      {
        date: '2026-04-01',
        description: 'Other',
        debit: 10,
        credit: null,
        category: 'EXPENSE_BANK_FEES',
      },
    ]

    const patched = patchStatementTransactions(statement, ledger)
    expect(patched[0].date).toBe('2026-05-18')
    expect(patched[0].confidence).toBe('Manual')
    expect(patched[1].date).toBe('2026-04-01')
  })
})
