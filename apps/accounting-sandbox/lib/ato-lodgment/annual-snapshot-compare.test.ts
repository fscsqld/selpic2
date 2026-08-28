import { describe, expect, it } from 'vitest'
import {
  annualCompareTotalAbsDelta,
  buildAnnualSnapshotCompareRow,
} from '@/lib/ato-lodgment/annual-snapshot-compare'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

describe('buildAnnualSnapshotCompareRow', () => {
  it('computes drift vs latest annual snapshot', () => {
    const live = [
      { id: 'MYTAX_TOTAL_INCOME', amount: 13108.62, label: '', section: 'income' },
      { id: 'MYTAX_TOTAL_EXPENSES', amount: 14783, label: '', section: 'expense' },
      { id: 'MYTAX_NET_INCOME', amount: -1674.38, label: '', section: 'summary' },
    ]
    const snap: LodgmentSnapshot = {
      id: 's1',
      kind: 'annual',
      periodKey: 'FY2025-2026',
      periodLabel: 'FY 2025-2026',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      accountType: 'sole_trader',
      fields: [
        { id: 'MYTAX_TOTAL_INCOME', amount: 13000, label: '', section: 'income' },
        { id: 'MYTAX_TOTAL_EXPENSES', amount: 14700, label: '', section: 'expense' },
        { id: 'MYTAX_NET_INCOME', amount: -1700, label: '', section: 'summary' },
      ],
      entered: {},
      validation: { ok: true, errors: [], warnings: [] },
      finalizedAt: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    const row = buildAnnualSnapshotCompareRow([snap], '2025-2026', live as never)
    expect(row.hasSnapshot).toBe(true)
    expect(row.metrics.MYTAX_TOTAL_INCOME.delta).toBeCloseTo(108.62, 2)
    expect(annualCompareTotalAbsDelta(row)).toBeGreaterThan(100)
  })
})
