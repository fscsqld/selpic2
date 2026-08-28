import { describe, expect, it } from 'vitest'
import {
  buildCtrSnapshotCompareRow,
  ctrCompareTotalAbsDelta,
} from '@/lib/ato-lodgment/ctr-snapshot-compare'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

describe('buildCtrSnapshotCompareRow', () => {
  it('computes drift vs latest CTR snapshot', () => {
    const live = [
      { id: 'CTR_6S_TOTAL_INCOME', amount: 13108.62, label: '', section: 'income' },
      { id: 'CTR_6Q_TOTAL_EXPENSES', amount: 14783, label: '', section: 'expense' },
      { id: 'CTR_6T_PROFIT_LOSS', amount: 1674.38, label: '', section: 'summary' },
    ]
    const snap: LodgmentSnapshot = {
      id: 'c1',
      kind: 'ctr',
      periodKey: 'CTR-FY2025-2026',
      periodLabel: 'CTR FY 2025-2026',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      accountType: 'company',
      fields: [
        { id: 'CTR_6S_TOTAL_INCOME', amount: 13000, label: '', section: 'income' },
        { id: 'CTR_6Q_TOTAL_EXPENSES', amount: 14700, label: '', section: 'expense' },
        { id: 'CTR_6T_PROFIT_LOSS', amount: 1700, label: '', section: 'summary' },
      ],
      entered: {},
      validation: { ok: true, errors: [], warnings: [] },
      finalizedAt: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    const row = buildCtrSnapshotCompareRow([snap], '2025-2026', live as never)
    expect(row.hasSnapshot).toBe(true)
    expect(row.metrics.CTR_6S_TOTAL_INCOME.delta).toBeCloseTo(108.62, 2)
    expect(ctrCompareTotalAbsDelta(row)).toBeGreaterThan(100)
  })
})
