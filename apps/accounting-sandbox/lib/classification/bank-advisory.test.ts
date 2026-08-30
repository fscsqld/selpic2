import { describe, expect, it } from 'vitest'
import {
  filterBankAdvisoryTransactions,
  isBankAdvisoryNotice,
  isBankStatementBoilerplateLine,
  isLikelyRatePercentAmountArtifact,
  sanitizeBankTransactionDescriptions,
  shouldExcludeBankAdvisoryTransaction,
  stripBankStatementBoilerplate,
} from '@/lib/classification/bank-advisory'
import { cleanTransactionDescription } from '@/lib/dashboard/clean-transaction-description'

describe('bank-advisory', () => {
  it('detects NAB interest rate notice phrases', () => {
    expect(isBankAdvisoryNotice('Please Note From Today Your')).toBe(true)
    expect(
      isBankAdvisoryNotice(
        '5 May 26 PLEASE NOTE FROM TODAY YOUR DR INTEREST RATE IS 15.410%'
      )
    ).toBe(true)
    expect(isBankAdvisoryNotice('EFTPOS WOOLWORTHS')).toBe(false)
  })

  it('flags rate percentage parsed as dollar credit', () => {
    expect(
      isLikelyRatePercentAmountArtifact(
        'PLEASE NOTE FROM TODAY YOUR DR INTEREST RATE IS 15.410%',
        15.41
      )
    ).toBe(true)
    expect(isLikelyRatePercentAmountArtifact('INT CREDIT', 15.41)).toBe(false)
  })

  it('excludes advisory transactions from ledgers', () => {
    const txs = [
      {
        date: '2026-05-15',
        description: 'Please Note From Today Your',
        debit: null,
        credit: 15.41,
        balance: 7050.58,
      },
      {
        date: '2026-05-14',
        description: 'INT CREDIT',
        debit: null,
        credit: 12.5,
        balance: 7035.17,
      },
    ]

    const filtered = filterBankAdvisoryTransactions(txs)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].description).toBe('INT CREDIT')
    expect(
      shouldExcludeBankAdvisoryTransaction({
        description: 'Please Note From Today Your',
        debit: null,
        credit: 15.41,
      })
    ).toBe(true)
  })

  it('strips NAB Transaction Listing footer glued onto BP Wishart', () => {
    const polluted =
      'BP (Wishart) Page 1 of 2 Important This Transaction Listing is not a statement of account. ' +
      'It is a list of transactions (including pending transactions) for the selected date range, ' +
      'as at the time and date the listing was created. National Australia Bank Limited ABN 12 004 044 937 ' +
      'AFSL and Australian Credit License 230686'
    expect(stripBankStatementBoilerplate(polluted)).toBe('BP (Wishart)')
    expect(cleanTransactionDescription(polluted)).toBe('BP')
    expect(isBankAdvisoryNotice(polluted)).toBe(false)
    expect(
      isBankStatementBoilerplateLine(
        'Page 1 of 2 Important This Transaction Listing is not a statement of account.'
      )
    ).toBe(true)
  })

  it('sanitizes bank rows but leaves cash expense descriptions alone', () => {
    const rows = sanitizeBankTransactionDescriptions([
      {
        description:
          'BP (Wishart) Page 1 of 2 Important This Transaction Listing is not a statement of account.',
        source: 'bank',
      },
      { description: 'Airfare Seoul', source: 'manual', id: 'cash_1' },
    ] as Array<{ description: string; source: string; id?: string }>)
    expect(rows[0].description).toBe('BP (Wishart)')
    expect(rows[1].description).toBe('Airfare Seoul')
  })
})
