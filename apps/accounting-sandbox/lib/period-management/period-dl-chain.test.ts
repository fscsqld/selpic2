import { describe, expect, it } from 'vitest'
import {
  computePeriodDirectorLoanChain,
  formatDirectorLoanCaption,
  firstDirectorLoanPeriodId,
} from '@/lib/period-management/period-utils'

/**
 * Mirrors the user's Period Management chain:
 * Dec airfare (director-funded) → … → Mar Settings $1,000 → Apr loan +$500 →
 * Jun reimbursements $8,781.89 without auto-match prior.
 */
describe('Period Management Director Loan chain (learned)', () => {
  const decAirfare = {
    date: '2025-12-15',
    description: 'Qantas airfare',
    debit: 1516.08,
    credit: null,
    category: 'EXPENSE_FUEL_TRAVEL',
    department: 'cleaning',
    source: 'manual',
    id: 'cash_airfare',
    fundedByDirector: true,
  }

  const janBank = {
    date: '2026-01-10',
    description: 'BP',
    debit: 50,
    credit: null,
    category: 'EXPENSE_FUEL_TRAVEL',
    department: 'cleaning',
  }

  const marFee = {
    date: '2026-03-26',
    description: 'Nab Intnl Tran Fee',
    debit: 1.53,
    credit: null,
    category: 'EXPENSE_BANK_FEES_INTEREST',
    department: 'cleaning',
    balance: 795.62,
  }

  const aprLoan = {
    date: '2026-04-01',
    description: 'Mr Jinsoo Kim Loan',
    debit: null,
    credit: 500,
    category: 'LIABILITY_DIRECTORS_LOAN',
    department: 'cleaning',
  }

  const junReimburse = {
    date: '2026-06-24',
    description: 'Director reimburse',
    debit: 8781.89,
    credit: null,
    category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
    department: 'cleaning',
  }

  it('treats director-funded Dec airfare as first DL activity month', () => {
    expect(firstDirectorLoanPeriodId([decAirfare, janBank, aprLoan])).toBe('2025-12')
  })

  it('Dec shows Company owes Settings + airfare; Jan/Feb stay chained; no Settings ghost on empty months', () => {
    const chain = computePeriodDirectorLoanChain(
      [decAirfare, janBank, marFee, aprLoan, junReimburse],
      1000,
      0
    )

    // Dec: Settings $1,000 + airfare $1,516.08
    expect(chain.get('2025-12')?.opening).toBe(1000)
    expect(chain.get('2025-12')?.closing).toBeCloseTo(1000 + 1516.08, 2)
    expect(formatDirectorLoanCaption(chain.get('2025-12')!.closing).role).toBe('company_owes')

    // Jan: no DL movement — still Company owes (carry Dec close)
    expect(chain.get('2026-01')?.closing).toBeCloseTo(1000 + 1516.08, 2)

    // Apr: +500 loan injection
    expect(chain.get('2026-04')?.closing).toBeCloseTo(1000 + 1516.08 + 500, 2)

    // Jun: reimbursements without auto-match prior → may flip to Director owes
    const jun = chain.get('2026-06')!.closing
    expect(jun).toBeCloseTo(1000 + 1516.08 + 500 - 8781.89, 2)
    expect(formatDirectorLoanCaption(jun).role).toBe('director_owes')
    expect(formatDirectorLoanCaption(jun).amount).toBeCloseTo(
      Math.abs(1000 + 1516.08 + 500 - 8781.89),
      2
    )
  })

  it('without Dec fundedByDirector, first DL month is April loan (Settings apply then)', () => {
    const airfareNoFlag = { ...decAirfare, fundedByDirector: false }
    const chain = computePeriodDirectorLoanChain(
      [airfareNoFlag, janBank, aprLoan, junReimburse],
      1000,
      0
    )
    // Dec has no DL flag → not first activity; Settings wait until April loan
    expect(firstDirectorLoanPeriodId([airfareNoFlag, janBank, aprLoan])).toBe('2026-04')
    expect(chain.get('2025-12')?.closing).toBe(0)
    expect(formatDirectorLoanCaption(chain.get('2025-12')!.closing).role).toBe('none')
    expect(chain.get('2026-04')?.opening).toBe(1000)
    expect(chain.get('2026-04')?.closing).toBe(1500)
    // June: 1500 - 8781.89 = -7281.89 (matches user's Period list math)
    expect(chain.get('2026-06')?.closing).toBeCloseTo(1500 - 8781.89, 2)
    expect(formatDirectorLoanCaption(chain.get('2026-06')!.closing)).toEqual({
      label: "Director's Loan (Director owes Company)",
      amount: 7281.89,
      role: 'director_owes',
    })
  })

  it('user June Director owes $7,281.89 is monthly-local (no auto-match prior)', () => {
    const chain = computePeriodDirectorLoanChain(
      [
        {
          date: '2026-03-01',
          category: 'LIABILITY_DIRECTORS_LOAN',
          credit: 0,
          debit: null,
          department: 'cleaning',
          isDirectorsLoan: true,
        },
        // Force first DL in March via personal/loan marker with zero movement is awkward;
        // use Settings month March by having a tiny loan credit then April +500.
        {
          date: '2026-03-15',
          description: 'Opening loan marker',
          debit: null,
          credit: 0.01,
          category: 'LIABILITY_DIRECTORS_LOAN',
          department: 'cleaning',
        },
        {
          date: '2026-04-01',
          description: 'Mr Jinsoo Kim Loan',
          debit: null,
          credit: 499.99,
          category: 'LIABILITY_DIRECTORS_LOAN',
          department: 'cleaning',
        },
        junReimburse,
      ],
      1000,
      0
    )
    // March opens at Settings 1000 + 0.01
    expect(chain.get('2026-03')?.opening).toBe(1000)
    expect(chain.get('2026-04')?.closing).toBeCloseTo(1500, 2)
    expect(chain.get('2026-06')?.closing).toBeCloseTo(-7281.89, 2)
  })

  it('rolls June closing into empty Jul/Aug when throughPeriodId is set (never bare Settings $1,000)', () => {
    const chain = computePeriodDirectorLoanChain(
      [decAirfare, janBank, marFee, aprLoan, junReimburse],
      1000,
      0,
      '2026-08'
    )
    const jun = 1000 + 1516.08 + 500 - 8781.89
    expect(chain.get('2026-06')?.closing).toBeCloseTo(jun, 2)
    expect(chain.get('2026-07')?.opening).toBeCloseTo(jun, 2)
    expect(chain.get('2026-07')?.closing).toBeCloseTo(jun, 2)
    expect(chain.get('2026-08')?.closing).toBeCloseTo(jun, 2)
    expect(formatDirectorLoanCaption(chain.get('2026-07')!.closing).role).toBe('director_owes')
    expect(formatDirectorLoanCaption(chain.get('2026-08')!.closing).role).toBe('director_owes')
    // Must NOT look like Company owes Settings $1,000
    expect(formatDirectorLoanCaption(chain.get('2026-07')!.closing).amount).not.toBe(1000)
  })
})
