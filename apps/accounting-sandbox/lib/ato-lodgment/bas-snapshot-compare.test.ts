import { describe, expect, it } from 'vitest'
import {
  basCompareDriftFields,
  basCompareTotalAbsDelta,
  buildBasPeriodCompareRows,
} from '@/lib/ato-lodgment/bas-snapshot-compare'
import type { LodgmentField } from '@/lib/ato-lodgment/types'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'

function field(id: string, amount: number): LodgmentField {
  return {
    id,
    label: id,
    description: '',
    section: 'gst',
    amount,
    source: 'auto',
    guide: { portal: 'osb', path: [], labelHint: id },
  }
}

describe('bas snapshot drift helpers', () => {
  it('sums absolute deltas and lists drifted fields', () => {
    const live = [
      field('G1', 13407.48),
      field('1A', 1218.86),
      field('1B', 564.98),
      field('1C', 653.88),
      field('7C', 0),
      field('W1', 0),
      field('W2', 0),
      field('4', 0),
    ]
    const snap: LodgmentSnapshot = {
      id: 's1',
      kind: 'bas',
      periodKey: '2025-2026-Q4',
      periodLabel: 'Q4 2025-2026',
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      accountType: 'company',
      fields: [
        field('G1', 13425.48),
        field('1A', 1218.86),
        field('1B', 1372.59),
        field('1C', 0),
        field('7C', 153.73),
        field('W1', 0),
        field('W2', 0),
        field('4', 0),
      ],
      entered: {},
      validation: { ready: false, blocking: [], warnings: [] },
      finalizedAt: null,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    }

    const rows = buildBasPeriodCompareRows([snap], [
      {
        periodKey: '2025-2026-Q4',
        periodLabel: 'Q4 2025-2026',
        fields: live,
      },
    ])

    // |18| + |807.61| + |653.88| + |153.73| = 1633.22
    expect(basCompareTotalAbsDelta(rows[0])).toBeCloseTo(1633.22, 2)
    const drifted = basCompareDriftFields(rows[0])
    expect(drifted.map((d) => d.id).sort()).toEqual(['1B', '1C', '7C', 'G1'])
  })
})
