import { describe, expect, it } from 'vitest'
import { applyKnownExpenseCategoriesIfMissing } from '@/lib/classification/apply-known-expense-categories'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { patchStatementTransactions } from '@/lib/storage/statement-transaction-scope'

describe('admin Manual edits survive reload hydration', () => {
  it('does not overwrite Manual category with a stronger company rule', () => {
    const hydrated = applyKnownExpenseCategoriesIfMissing([
      {
        date: '2026-03-26',
        description: 'Nab Intnl Tran Fee',
        debit: 1.53,
        credit: null,
        // Admin deliberately reclassified away from bank fees
        category: 'EXPENSE_OFFICE_SUPPLIES',
        department: 'cleaning',
        confidence: 'Manual',
      },
    ])
    expect(hydrated[0].category).toBe('EXPENSE_OFFICE_SUPPLIES')
    expect(hydrated[0].confidence).toBe('Manual')
  })

  it('still auto-fixes Uncategorized / non-Manual rows', () => {
    const hydrated = applyKnownExpenseCategoriesIfMissing([
      {
        date: '2026-03-26',
        description: 'Nab Intnl Tran Fee',
        debit: 1.53,
        credit: null,
        category: 'UNCATEGORIZED',
        department: 'cleaning',
        confidence: 0.4,
      },
    ])
    expect(hydrated[0].category).toBe('EXPENSE_BANK_FEES_INTEREST')
  })

  it('keeps Manual GST FREE through known GST tags', () => {
    const tagged = applyKnownPurchaseGstTags([
      {
        description: 'Crazydomains Website Ho',
        debit: 50.85,
        category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
        gstInfo: {
          isGSTIncluded: false,
          gstType: 'FREE' as const,
          gstAmount: 0,
          reasoning: 'Manual: company expense without AU GST claim',
        },
      },
    ])
    expect(tagged[0].gstInfo?.gstType).toBe('FREE')
  })
})

describe('patchStatementTransactions — admin field round-trip', () => {
  const statementRow = {
    id: 'tx_nab_1',
    date: '2026-03-26',
    description: 'Nab Intnl Tran Fee',
    debit: 1.53,
    credit: null as number | null,
    category: 'EXPENSE_BANK_FEES_INTEREST',
    department: 'cleaning',
    gstInfo: {
      isGSTIncluded: true,
      gstType: 'INCLUDED' as const,
      gstAmount: 1.53 / 11,
    },
  }

  it('writes Manual category, department, and GST FREE onto the statement row', () => {
    const ledger = [
      {
        ...statementRow,
        category: 'EXPENSE_OFFICE_SUPPLIES',
        department: 'general',
        confidence: 'Manual',
        gstInfo: {
          isGSTIncluded: false,
          gstType: 'FREE' as const,
          gstAmount: 0,
          reasoning: 'Manual: company expense without AU GST claim',
        },
      },
    ]
    const patched = patchStatementTransactions([statementRow], ledger)
    expect(patched[0].category).toBe('EXPENSE_OFFICE_SUPPLIES')
    expect(patched[0].department).toBe('general')
    expect(patched[0].confidence).toBe('Manual')
    expect(patched[0].gstInfo?.gstType).toBe('FREE')
  })

  it('writes Manual amount and date corrections', () => {
    const ledger = [
      {
        ...statementRow,
        date: '2026-03-27',
        debit: 2.0,
        confidence: 'Manual',
      },
    ]
    const patched = patchStatementTransactions([statementRow], ledger)
    expect(patched[0].date).toBe('2026-03-27')
    expect(patched[0].debit).toBe(2.0)
  })
})
