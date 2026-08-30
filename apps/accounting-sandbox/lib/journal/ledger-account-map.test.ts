import { describe, expect, it } from 'vitest'
import { resolveLedgerCategoryAccount } from '@/lib/journal/ledger-account-map'
import { COA } from '@/lib/journal/chart-of-accounts'
import { transactionToLedgerLines } from '@/lib/journal/general-ledger'
import { classifyAccount } from '@/lib/journal/chart-of-accounts'

describe('ledger-account-map', () => {
  it('maps director reimbursement debit to directors loan, not expense', () => {
    expect(resolveLedgerCategoryAccount('NON_TAXABLE_DIRECTOR_REIMBURSEMENT', 'debit')).toBe(
      COA.DIRECTORS_LOAN
    )
  })

  it('maps ATO GST refund to GST payable clearing', () => {
    expect(resolveLedgerCategoryAccount('NON_TAXABLE_ATO_GST_REFUND', 'credit')).toBe(
      COA.GST_PAYABLE
    )
  })

  it('maps refund debit (misclass) to directors loan', () => {
    expect(resolveLedgerCategoryAccount('INCOME_REFUND_REIMBURSEMENT', 'debit')).toBe(
      COA.DIRECTORS_LOAN
    )
  })

  it('posts director reimbursement to liability in GL lines', () => {
    const lines = transactionToLedgerLines({
      date: '2026-06-24',
      description: 'Jinsoo Kim V7533652037',
      debit: 129.6,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
    })
    const categoryLine = lines.find((l) => l.debit > 0)
    expect(categoryLine?.account).toBe(COA.DIRECTORS_LOAN)
    expect(classifyAccount(categoryLine!.account)).toBe('Liability')
  })

  it('does not classify NON_TAXABLE_ATO refund as expense', () => {
    expect(classifyAccount('NON_TAXABLE_ATO_GST_REFUND')).toBe('Liability')
  })
})
