import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/storage/indexed-db', () => ({
  indexedDBStorage: {
    getBankReconciliationByPeriod: vi.fn(async () => null),
    getAllTimesheets: vi.fn(async () => []),
  },
}))

vi.mock('@/lib/subledger/ar-ap-service', () => ({
  getSubledgerBalances: vi.fn(async () => ({
    openAR: 0,
    openAP: 0,
    overdueAR: 0,
    overdueAP: 0,
  })),
}))

import { buildMonthEndChecklist, resolveMonthEndPeriodId } from '@/lib/subledger/month-end-checklist'
import { filterTransactionsForPeriod } from '@/lib/subledger/bank-reconciliation'

describe('month-end bank recon vs cash expense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not treat December Cash Expense airfare as uncleared bank lines', async () => {
    const result = await buildMonthEndChecklist(
      [
        {
          id: 'cash_airfare_1',
          date: '2025-12-15',
          description: 'Airfare',
          category: 'EXPENSE_TRAVEL_TRANSPORT',
          source: 'manual',
        },
      ],
      [{ id: '2025-12', isLocked: false } as any],
      '2025-12'
    )

    const bankTask = result.tasks.find((t) => t.id === 'bank-recon')
    expect(bankTask?.status).toBe('done')
    expect(bankTask?.count).toBe(0)
    expect(bankTask?.detail).toMatch(/Cash Expense only/i)
  })

  it('excludes cash_ ids from bank reconciliation period filter', () => {
    const filtered = filterTransactionsForPeriod(
      [
        {
          id: 'cash_1',
          date: '2025-12-10',
          description: 'Airfare',
          source: 'manual',
        },
        {
          id: 'bank_1',
          date: '2025-12-12',
          description: 'NAB fee',
        },
      ],
      '2025-12'
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('bank_1')
  })
})

describe('resolveMonthEndPeriodId', () => {
  it('ignores empty FY-start preferred month and uses latest month with activity', () => {
    expect(
      resolveMonthEndPeriodId(
        [
          { date: '2026-04-07' },
          { date: '2026-06-24' },
          { date: '2026-05-12' },
        ],
        '2025-07'
      )
    ).toBe('2026-06')
  })

  it('keeps preferred month when it has ledger activity', () => {
    expect(
      resolveMonthEndPeriodId(
        [{ date: '2026-04-07' }, { date: '2026-06-24' }],
        '2026-04'
      )
    ).toBe('2026-04')
  })
})
