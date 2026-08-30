import { describe, expect, it } from 'vitest'
import {
  inferFundedByDirector,
  hydrateFundedByDirectorOnLedger,
} from './funded-by-director'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { computePeriodDirectorLoanChain, formatDirectorLoanCaption } from '@/lib/period-management/period-utils'

describe('inferFundedByDirector', () => {
  it('honours explicit paidBy / fundedByDirector', () => {
    expect(inferFundedByDirector({ paidBy: 'director' })).toBe(true)
    expect(inferFundedByDirector({ paidBy: 'company' })).toBe(false)
    expect(inferFundedByDirector({ fundedByDirector: true })).toBe(true)
  })

  it('heals legacy December airfare Cash Expense as director-funded', () => {
    expect(
      inferFundedByDirector({
        merchant: 'Qantas airfare',
        category: 'EXPENSE_TRAVEL',
      })
    ).toBe(true)
    expect(
      inferFundedByDirector({
        description: '항공료',
        source: 'manual',
        id: 'cash_1',
      })
    ).toBe(true)
  })

  it('legacy manual Cash Expense without paidBy defaults to director-funded', () => {
    expect(
      inferFundedByDirector({
        merchant: 'Officeworks',
        category: 'EXPENSE_OFFICE_SUPPLIES',
        source: 'manual',
        id: 'cash_legacy',
      })
    ).toBe(true)
  })

  it('explicit company petty cash stays company-funded', () => {
    expect(
      inferFundedByDirector({
        merchant: 'Officeworks',
        paidBy: 'company',
        source: 'manual',
        id: 'cash_2',
      })
    ).toBe(false)
  })
})

describe('hydrate + Period chain (Dec was None root cause)', () => {
  it('hydrates missing fundedByDirector so Dec shows Company owes Director', () => {
    const raw = [
      {
        date: '2025-12-15',
        description: 'Airfare',
        debit: 1516.08,
        credit: null,
        category: 'EXPENSE_TRAVEL',
        department: 'cleaning',
        source: 'manual',
        id: 'cash_airfare',
        // fundedByDirector intentionally missing — root cause of Period None
      },
    ]
    const hydrated = hydrateFundedByDirectorOnLedger(raw as any)
    expect(hydrated[0].fundedByDirector).toBe(true)

    const chain = computePeriodDirectorLoanChain(raw as any, 0, 0)
    expect(chain.get('2025-12')?.closing).toBeCloseTo(1516.08, 2)
    expect(formatDirectorLoanCaption(chain.get('2025-12')!.closing).role).toBe('company_owes')
  })

  it('increases Director Loan payable when director pays a company cost', () => {
    const metrics = calculateBusinessMetrics(
      [
        {
          date: '2025-12-15',
          description: 'Airfare',
          debit: 1516.08,
          credit: null,
          category: 'EXPENSE_TRAVEL',
          department: 'cleaning',
          fundedByDirector: true,
          source: 'manual',
        } as any,
      ],
      0
    )
    expect(metrics.directorsLoanBalance).toBeCloseTo(1516.08, 2)
    expect(metrics.totalExpenses).toBeCloseTo(1516.08, 2)
  })
})
